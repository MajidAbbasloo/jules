import { PrismaClient, UserRole, Course, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { GraphQLScalarType, Kind } from 'graphql';

// TODO: Define input types more formally if using validation libraries (e.g. Zod)
// For now, they are inferred from GraphQL schema inputs.
// interface RegisterInput { ... }
// interface LoginInput { ... }
// interface CreateCourseInput { ... }
// ... etc.

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

interface Context {
  prisma: PrismaClient;
  user?: { id: string; role: UserRole }; // Optional user, present if authenticated
}

// Custom DateTime scalar
const DateTimeResolver = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  parseValue(value: any) {
    return new Date(value); // value from the client
  },
  serialize(value: any) {
    return value.toISOString(); // value sent to the client
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10)); // ast value is always in string format
    }
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Custom Json scalar (basic implementation)
const JsonResolver = new GraphQLScalarType({
    name: 'Json',
    description: 'Json custom scalar type',
    parseValue(value: any) {
        return value; // value from the client (assume it's already JSON)
    },
    serialize(value: any) {
        return value; // value sent to the client
    },
    parseLiteral(ast) {
        if (ast.kind === Kind.STRING) {
            try {
                return JSON.parse(ast.value);
            } catch (e) {
                return null; // Or throw error
            }
        }
        // Add handling for other AST kinds if necessary (e.g. OBJECT, LIST)
        return null;
    },
});


export const resolvers = {
  DateTime: DateTimeResolver,
  Json: JsonResolver,

  Query: {
    me: async (_parent: any, _args: any, context: Context) => {
      if (!context.user) {
        return null;
      }
      return context.prisma.user.findUnique({
        where: { id: context.user.id },
        include: { profile: true },
      });
    },

    // Course Queries
    getCourseById: async (_parent: any, { id }: { id: string }, context: Context) => {
      return context.prisma.course.findUnique({
        where: { id },
        include: {
          instructor: { include: { profile: true } },
          sections: { include: { lessons: true }, orderBy: { order: 'asc'} },
          category: true,
          reviews: { include: { user: { include: { profile: true } } } },
          // enrollments: true, // Potentially large, fetch separately or paginate
        },
      });
    },
    getAllCourses: async (
        _parent: any,
        {
            publishedOnly = true, // Default to true for public queries
            searchQuery,
            categoryIds,
            levels,
            priceMin,
            priceMax,
            languages,
            sortBy
        }: {
            publishedOnly?: boolean,
            searchQuery?: string,
            categoryIds?: string[],
            levels?: CourseLevel[],
            priceMin?: number,
            priceMax?: number,
            languages?: string[],
            sortBy?: string // Corresponds to CourseSortBy enum
        },
        context: Context
    ) => {
      let where: Prisma.CourseWhereInput = publishedOnly ? { isPublished: true } : {};
      const orderBy: Prisma.CourseOrderByWithRelationInput[] = [];

      if (searchQuery) {
        where.OR = [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ];
      }
      if (categoryIds && categoryIds.length > 0) {
        where.categoryId = { in: categoryIds };
      }
      if (levels && levels.length > 0) {
        // @ts-ignore // Prisma enum type vs GraphQL enum type might differ slightly
        where.level = { in: levels.filter(l => l !== 'ALL_LEVELS') }; // Filter out ALL_LEVELS if present
      }
      if (languages && languages.length > 0) {
        where.language = { in: languages };
      }
      if (priceMin !== undefined) {
        where.price = { ...where.price as Prisma.FloatFilter, gte: priceMin };
      }
      if (priceMax !== undefined) {
         if (priceMax === 0) { // Special case for free courses
            where.price = { equals: 0 };
        } else {
            where.price = { ...where.price as Prisma.FloatFilter, lte: priceMax };
        }
      }

      // Sorting logic
      switch (sortBy) {
        case 'NEWEST':
          orderBy.push({ createdAt: 'desc' });
          break;
        case 'POPULARITY': // Requires sorting by enrollments count
          orderBy.push({ enrollments: { _count: 'desc' } });
          break;
        case 'HIGHEST_RATED': // Requires sorting by average rating (complex, see Course type resolver)
           // This is more complex and typically done via a derived field or a view if DB doesn't support direct sort on aggregate.
           // For now, we'll sort by createdAt as a fallback if this is chosen.
           // A dedicated resolver for Course.averageRating will be added.
           // We can't directly sort by a custom resolved field in the main Prisma query easily.
           // One approach is to fetch all, then sort in JS, but that's bad for pagination.
           // Another is a raw query or a more complex setup.
           // For simplicity in this step, if HIGHEST_RATED is chosen, we'll defer actual sorting by rating to client or a post-processing step.
           // Or, if performance allows and results are not huge, fetch necessary data and sort in resolver.
           // Let's just add createdAt for now as a default sort for this case.
          orderBy.push({ createdAt: 'desc' }); // Placeholder, actual rating sort is tricky
          break;
        default:
          orderBy.push({ createdAt: 'desc' });
      }

      return context.prisma.course.findMany({
        where,
        include: {
          instructor: { include: { profile: true } },
          category: true,
          _count: { select: { enrollments: true, lessons: true } }, // For POPULARITY sort and general info
          reviews: { select: { rating: true } } // For HIGHEST_RATED calculation
        },
        orderBy,
        // TODO: Add take and skip for pagination
      });
    },
    getCoursesByCategory: async (_parent: any, { categoryId, publishedOnly = true }: { categoryId: string, publishedOnly?: boolean }, context: Context) => {
      return context.prisma.course.findMany({
        where: {
          categoryId,
          ...(publishedOnly && { isPublished: true })
        },
        include: {
          instructor: { include: { profile: true } },
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Category Queries
    getAllCategories: async (_parent: any, _args: any, context: Context) => {
      return context.prisma.category.findMany({
        include: { _count: { select: { courses: true } } }, // Include course count
        orderBy: { name: 'asc' },
      });
    },
    getCategoryById: async (_parent: any, { id }: { id: string }, context: Context) => {
      return context.prisma.category.findUnique({
        where: { id },
        include: { courses: { where: { isPublished: true } } },
      });
    },
    getCategoryBySlug: async (_parent: any, { slug }: { slug: string }, context: Context) => {
      return context.prisma.category.findUnique({
        where: { slug },
      });
    },
    getCoursesByCategorySlug: async (_parent: any, { slug, publishedOnly = true }: { slug: string, publishedOnly?: boolean }, context: Context) => {
      const category = await context.prisma.category.findUnique({ where: { slug } });
      if (!category) {
        throw new UserInputError('Category not found for the given slug.');
      }
      return context.prisma.course.findMany({
        where: {
          categoryId: category.id,
          ...(publishedOnly && { isPublished: true })
        },
        include: {
          instructor: { include: { profile: true } },
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },
    // Admin queries from previous step
    getAllUsers: async (_parent: any, _args: any, context: Context) => {
      if (!context.user || context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Access denied. Admin role required.');
      }
      return context.prisma.user.findMany({
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    getAllCoursesForAdmin: async (_parent: any, { publishedOnly }: { publishedOnly?: boolean }, context: Context) => {
      if (!context.user || context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Access denied. Admin role required.');
      }
      const whereClause = publishedOnly === undefined ? {} : { isPublished: publishedOnly };
      return context.prisma.course.findMany({
        where: whereClause,
        include: {
          instructor: { include: { profile: true } },
          category: true,
          sections: { include: { lessons: true } },
           _count: { select: { enrollments: true } }
        },
        orderBy: { createdAt: 'desc' },
      });
    },
    // Enrollment queries from previous step
    getMyEnrolledCourses: async (_parent: any, _args: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated.');
      }
      return context.prisma.enrollment.findMany({
        where: { userId: context.user.id },
        include: {
          course: {
            include: {
              instructor: { include: { profile: true } },
              category: true,
              _count: { select: { sections: true, lessons: true } }
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      });
    },
    isEnrolled: async (_parent: any, { courseId }: { courseId: string }, context: Context): Promise<boolean> => {
        if (!context.user) {
            return false;
        }
        const enrollment = await context.prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: context.user.id,
                    courseId: courseId,
                },
            },
        });
        return !!enrollment;
    },
  },

  Mutation: {
    // --- Auth Mutations ---
    register: async (_parent: any, { input }: { input: any /* RegisterInput */ }, context: Context) => {
      const { email, password, firstName, lastName, role } = input;
      if (!email || !password) throw new UserInputError('Email and password are required.');
      if (password.length < 6) throw new UserInputError('Password must be at least 6 characters long.');

      const existingUser = await context.prisma.user.findUnique({ where: { email } });
      if (existingUser) throw new UserInputError('User with this email already exists.');

      const hashedPassword = await bcrypt.hash(password, 10);
      const userRole = role || UserRole.STUDENT;

      const user = await context.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: userRole,
          profile: (firstName || lastName) ? { create: { firstName, lastName } } : undefined,
        },
        include: { profile: true },
      });

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      return { token, user };
    },

    login: async (_parent: any, { input }: { input: any /* LoginInput */ }, context: Context) => {
      const { email, password } = input;
      const user = await context.prisma.user.findUnique({ where: { email }, include: { profile: true } });
      if (!user) throw new AuthenticationError('Invalid credentials.');

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) throw new AuthenticationError('Invalid credentials.');

      // if (!user.isEmailVerified) throw new AuthenticationError('Please verify your email.');

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      return { token, user };
    },

    // --- Course Mutations ---
    createCourse: async (_parent: any, { input }: { input: any /* CreateCourseInput */ }, context: Context): Promise<Course> => {
      if (!context.user) throw new AuthenticationError('Not authenticated');
      if (context.user.role !== UserRole.INSTRUCTOR && context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only instructors or admins can create courses.');
      }

      const { title, description, price, thumbnailUrl, tags, categoryId } = input;
      if (!title) throw new UserInputError('Course title is required.');

      return context.prisma.course.create({
        data: {
          title,
          description,
          price,
          thumbnailUrl,
          tags: tags || [],
          instructorId: context.user.id,
          ...(categoryId && { category: { connect: { id: categoryId } } }),
        },
        include: { instructor: { include: { profile: true } }, category: true }
      });
    },

    updateCourse: async (_parent: any, { id, input }: { id: string, input: any /* UpdateCourseInput */ }, context: Context): Promise<Course | null> => {
      if (!context.user) throw new AuthenticationError('Not authenticated');

      const course = await context.prisma.course.findUnique({ where: { id } });
      if (!course) throw new UserInputError('Course not found.');

      if (context.user.role !== UserRole.ADMIN && course.instructorId !== context.user.id) {
        throw new ForbiddenError('You can only update your own courses.');
      }

      const { title, description, price, thumbnailUrl, tags, isPublished, categoryId } = input;

      return context.prisma.course.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(price !== undefined && { price }), // Allow setting price to 0
          ...(thumbnailUrl && { thumbnailUrl }),
          ...(tags && { tags }),
          ...(isPublished !== undefined && { isPublished }),
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          ...(!categoryId && input.hasOwnProperty('categoryId') && { category: { disconnect: true } }), // Allow unsetting category
        },
         include: { instructor: { include: { profile: true } }, category: true, sections: {include: {lessons: true}} }
      });
    },

    deleteCourse: async (_parent: any, { id }: { id: string }, context: Context): Promise<Course | null> => {
      if (!context.user) throw new AuthenticationError('Not authenticated');

      const course = await context.prisma.course.findUnique({ where: { id } });
      if (!course) throw new UserInputError('Course not found.');

      if (context.user.role !== UserRole.ADMIN && course.instructorId !== context.user.id) {
        throw new ForbiddenError('You can only delete your own courses.');
      }
      // Add more checks: e.g., cannot delete if there are active enrollments, unless admin override.
      // For simplicity, direct delete for now. Consider soft delete in real app.
      return context.prisma.course.delete({ where: { id } });
    },

    publishCourse: async (_parent: any, { id }: { id: string }, context: Context): Promise<Course | null> => {
      if (!context.user) throw new AuthenticationError('Not authenticated');
      const course = await context.prisma.course.findUnique({ where: { id } });
      if (!course) throw new UserInputError('Course not found.');
      if (context.user.role !== UserRole.ADMIN && course.instructorId !== context.user.id) {
        throw new ForbiddenError('You can only publish your own courses.');
      }
      // TODO: Add validation, e.g., course must have at least one section and lesson.
      return context.prisma.course.update({
        where: { id },
        data: { isPublished: true },
        include: { instructor: {include: {profile: true}}, category: true }
      });
    },

    unpublishCourse: async (_parent: any, { id }: { id: string }, context: Context): Promise<Course | null> => {
      if (!context.user) throw new AuthenticationError('Not authenticated');
      const course = await context.prisma.course.findUnique({ where: { id } });
      if (!course) throw new UserInputError('Course not found.');
      if (context.user.role !== UserRole.ADMIN && course.instructorId !== context.user.id) {
        throw new ForbiddenError('You can only unpublish your own courses.');
      }
      return context.prisma.course.update({
        where: { id },
        data: { isPublished: false },
        include: { instructor: {include: {profile: true}}, category: true }
      });
    },

    // --- Section Mutations ---
    createSection: async (_parent: any, { input }: { input: any /* CreateSectionInput */ }, context: Context) => {
        if (!context.user) throw new AuthenticationError('Not authenticated');
        const { title, order, courseId } = input;
        if(!title || order === undefined || !courseId) throw new UserInputError('Missing required fields for section.');

        const course = await context.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) throw new UserInputError('Course not found.');
        if (context.user.role !== UserRole.ADMIN && course.instructorId !== context.user.id) {
            throw new ForbiddenError('You can only add sections to your own courses.');
        }
        return context.prisma.section.create({
            data: { title, order, courseId },
            include: { course: true, lessons: true }
        });
    },

    updateSection: async (_parent: any, { id, input }: { id: string, input: any /* UpdateSectionInput */ }, context: Context) => {
        if (!context.user) throw new AuthenticationError('Not authenticated');
        const section = await context.prisma.section.findUnique({ where: { id }, include: { course: true } });
        if (!section) throw new UserInputError('Section not found.');
        if (context.user.role !== UserRole.ADMIN && section.course.instructorId !== context.user.id) {
            throw new ForbiddenError('You can only update sections in your own courses.');
        }
        return context.prisma.section.update({
            where: { id },
            data: { ...input },
            include: { course: true, lessons: true }
        });
    },

    deleteSection: async (_parent: any, { id }: { id: string }, context: Context) => {
        if (!context.user) throw new AuthenticationError('Not authenticated');
        const section = await context.prisma.section.findUnique({ where: { id }, include: { course: true } });
        if (!section) throw new UserInputError('Section not found.');
        if (context.user.role !== UserRole.ADMIN && section.course.instructorId !== context.user.id) {
            throw new ForbiddenError('You can only delete sections from your own courses.');
        }
        // Lessons within section will be cascade deleted due to schema relation
        return context.prisma.section.delete({ where: { id } });
    },

    // --- Lesson Mutations ---
    createLesson: async (_parent: any, { input }: { input: any /* CreateLessonInput */ }, context: Context) => {
        if (!context.user) throw new AuthenticationError('Not authenticated');
        const { title, order, sectionId, content, videoUrl, duration, isPreviewable, resources } = input;
        if(!title || order === undefined || !sectionId) throw new UserInputError('Missing required fields for lesson.');

        const section = await context.prisma.section.findUnique({ where: { id: sectionId }, include: { course: true } });
        if (!section) throw new UserInputError('Section not found.');
        if (context.user.role !== UserRole.ADMIN && section.course.instructorId !== context.user.id) {
            throw new ForbiddenError('You can only add lessons to sections in your own courses.');
        }
        return context.prisma.lesson.create({
            data: { title, order, sectionId, content, videoUrl, duration, isPreviewable: isPreviewable || false, resources: resources || Prisma.JsonNull },
            include: { section: { include: { course: true } } }
        });
    },

    updateLesson: async (_parent: any, { id, input }: { id: string, input: any /* UpdateLessonInput */ }, context: Context) => {
        if (!context.user) throw new AuthenticationError('Not authenticated');
        const lesson = await context.prisma.lesson.findUnique({ where: { id }, include: { section: { include: { course: true } } } });
        if (!lesson) throw new UserInputError('Lesson not found.');
        if (context.user.role !== UserRole.ADMIN && lesson.section.course.instructorId !== context.user.id) {
            throw new ForbiddenError('You can only update lessons in your own courses.');
        }
        return context.prisma.lesson.update({
            where: { id },
            data: { ...input, ...(input.resources === undefined && { resources: Prisma.JsonNull }) }, // Ensure resources can be nulled
            include: { section: { include: { course: true } } }
        });
    },

    deleteLesson: async (_parent: any, { id }: { id: string }, context: Context) => {
        if (!context.user) throw new AuthenticationError('Not authenticated');
        const lesson = await context.prisma.lesson.findUnique({ where: { id }, include: { section: { include: { course: true } } } });
        if (!lesson) throw new UserInputError('Lesson not found.');
        if (context.user.role !== UserRole.ADMIN && lesson.section.course.instructorId !== context.user.id) {
            throw new ForbiddenError('You can only delete lessons from your own courses.');
        }
        return context.prisma.lesson.delete({ where: { id } });
    },

    // --- Category Mutations (Admin only) ---
    createCategory: async (_parent: any, { name, slug, description }: { name: string, slug: string, description?: string }, context: Context) => {
        if (!context.user || context.user.role !== UserRole.ADMIN) throw new ForbiddenError('Only admins can create categories.');
        if(!name || !slug) throw new UserInputError('Category name and slug are required.');
        return context.prisma.category.create({ data: { name, slug, description } });
    },

    updateCategory: async (_parent: any, { id, name, slug, description }: { id: string, name?: string, slug?: string, description?: string }, context: Context) => {
        if (!context.user || context.user.role !== UserRole.ADMIN) throw new ForbiddenError('Only admins can update categories.');
        return context.prisma.category.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(slug && { slug }),
                ...(description !== undefined && { description }), // Allow setting description to null/empty
             },
        });
    },

    deleteCategory: async (_parent: any, { id }: { id: string }, context: Context) => {
        if (!context.user || context.user.role !== UserRole.ADMIN) throw new ForbiddenError('Only admins can delete categories.');
        // Note: Deleting a category might fail if courses are still linked to it,
        // depending on DB constraints or if you add checks here.
        // Consider setting categoryId on courses to null instead, or preventing deletion if courses exist.
        return context.prisma.category.delete({ where: { id } });
    },

    // --- Enrollment Mutation ---
    enrollInCourse: async (_parent: any, { courseId }: { courseId: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated. Please log in to enroll.');
      }
      if (context.user.role !== UserRole.STUDENT) {
        // For now, only students can enroll. Instructors/Admins have implicit access.
        // This could be changed if instructors should also "enroll" for tracking.
        throw new ForbiddenError('Only students can enroll in courses.');
      }

      const courseToEnroll = await context.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!courseToEnroll) {
        throw new UserInputError('Course not found.');
      }
      if (!courseToEnroll.isPublished) {
        throw new ForbiddenError('This course is not currently published and open for enrollment.');
      }

      const existingEnrollment = await context.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: context.user.id,
            courseId: courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new UserInputError('You are already enrolled in this course.');
      }

      return context.prisma.enrollment.create({
        data: {
          userId: context.user.id,
          courseId: courseId,
          progress: 0, // Initial progress
        },
        include: {
          user: { include: { profile: true } },
          course: true,
        },
      });
    }
  },

  Query: { // Extend Query block for new queries
    ...resolvers.Query, // Keep existing queries
    getMyEnrolledCourses: async (_parent: any, _args: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated.');
      }
      // Typically for students, but an admin/instructor might want to see their test enrollments too.
      // Add role check if strictly for students:
      // if (context.user.role !== UserRole.STUDENT) {
      //   return []; // Or throw ForbiddenError
      // }
      return context.prisma.enrollment.findMany({
        where: { userId: context.user.id },
        include: {
          course: { // Include details of the enrolled course
            include: {
              instructor: { include: { profile: true } },
              category: true,
              _count: { select: { sections: true, lessons: true } } // Example counts
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      });
    },
    isEnrolled: async (_parent: any, { courseId }: { courseId: string }, context: Context): Promise<boolean> => {
        if (!context.user) {
            return false; // Not authenticated, so not enrolled
        }
        const enrollment = await context.prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: context.user.id,
                    courseId: courseId,
                },
            },
        });
        return !!enrollment;
    },
    getMyEnrollmentForCourse: async (_parent: any, { courseId }: { courseId: string }, context: Context) => {
        if (!context.user) {
            // Or throw AuthenticationError if enrollment info is sensitive even for existence check
            return null;
        }
        return context.prisma.enrollment.findUnique({
            where: {
                userId_courseId: {
                    userId: context.user.id,
                    courseId: courseId,
                },
            },
            // Include whatever fields the client needs, e.g., progress, completedLessons
            include: {
                course: { // Minimal course info, or specific fields if needed
                    select: { id: true, title: true }
                }
            }
        });
    },
    getAllUsers: async (_parent: any, _args: any, context: Context) => {
      if (!context.user || context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Access denied. Admin role required.');
      }
      return context.prisma.user.findMany({
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    getAllCoursesForAdmin: async (_parent: any, { publishedOnly }: { publishedOnly?: boolean }, context: Context) => {
      if (!context.user || context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Access denied. Admin role required.');
      }
      // If publishedOnly is undefined, admin sees all. If true/false, it filters.
      const whereClause = publishedOnly === undefined ? {} : { isPublished: publishedOnly };

      return context.prisma.course.findMany({
        where: whereClause,
        include: {
          instructor: { include: { profile: true } },
          category: true,
          sections: { include: { lessons: true } }, // Admin might want full details
           _count: { select: { enrollments: true } }
        },
        orderBy: { createdAt: 'desc' },
      });
    },
    getQuestionsForLesson: async (_parent: any, { lessonId }: { lessonId: string }, context: Context) => {
      // Check if lesson exists (optional, but good practice)
      const lesson = await context.prisma.lesson.findUnique({ where: { id: lessonId } });
      if (!lesson) {
        throw new UserInputError('Lesson not found.');
      }
      // TODO: Add authorization: User must be enrolled in the course to see questions,
      // or the lesson must be previewable. For now, fetching all.
      return context.prisma.question.findMany({
        where: { lessonId },
        include: {
          user: { include: { profile: true } }, // User who asked
          answers: { // Answers for each question
            include: {
              user: { include: { profile: true } } // User who answered
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    },
    getReviewsForCourse: async (_parent: any, { courseId }: { courseId: string }, context: Context) => {
      return context.prisma.review.findMany({
        where: { courseId },
        include: {
          user: { include: { profile: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    },
    getTotalUsersCount: async (_parent: any, _args: any, context: Context) => {
      if (!context.user || context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Access denied. Admin role required.');
      }
      return context.prisma.user.count();
    },
    getTotalCoursesCount: async (_parent: any, _args: any, context: Context) => {
      if (!context.user || context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Access denied. Admin role required.');
      }
      return context.prisma.course.count();
    },
    getTotalCategoriesCount: async (_parent: any, _args: any, context: Context) => {
      if (!context.user || context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Access denied. Admin role required.');
      }
      return context.prisma.category.count();
    },
    getQuizForInstructor: async (_parent: any, { quizId }: { quizId: string }, context: Context) => {
      if (!context.user) throw new AuthenticationError('Not authenticated');

      const quiz = await context.prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          lesson: { include: { section: { include: { course: true } } } },
          questions: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { id: 'asc' } } } // Assuming simple order for options
          }
        }
      });

      if (!quiz) throw new UserInputError('Quiz not found.');

      // Authorization: User must be the instructor of the course this quiz belongs to, or an Admin
      const instructorId = quiz.lesson.section.course.instructorId;
      if (context.user.role !== UserRole.ADMIN && context.user.id !== instructorId) {
        throw new ForbiddenError('You are not authorized to manage this quiz.');
      }

      // For instructors, we return all details including correct answers in options
      return quiz;
    },
    getMyBookmarkedLessons: async (_parent: any, _args: any, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in to view your bookmarks.');
      }
      const bookmarks = await context.prisma.bookmark.findMany({
        where: { userId: context.user.id },
        include: {
          lesson: {
            include: {
              section: { include: { course: {select : {id: true, title: true}} } } // Include course for context
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return bookmarks.map(bookmark => bookmark.lesson);
    },
    getQuizForStudent: async (_parent: any, { quizId }: { quizId: string }, context: Context) => {
      if (!context.user) throw new AuthenticationError('Not authenticated');

      // Student must be enrolled in the course to take the quiz
      const quiz = await context.prisma.quiz.findUnique({
        where: { id: quizId },
        include: { lesson: { include: { section: { include: { course: true } } } } }
      });
      if (!quiz) throw new UserInputError('Quiz not found.');

      const enrollment = await context.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: context.user.id, courseId: quiz.lesson.section.courseId } }
      });
      if (!enrollment && context.user.role === UserRole.STUDENT) { // Allow instructor/admin to view this version too for testing
        throw new ForbiddenError('You are not enrolled in this course.');
      }

      // Fetch quiz, but options will be filtered by the QuizQuestion.options resolver
      return context.prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          lesson: { select: { id: true, title: true } }, // Minimal lesson info
          questions: {
            orderBy: { order: 'asc' },
            include: {
              options: true // Options resolver will handle stripping `isCorrect`
            }
          }
        }
      });
    },
  },

  Mutation: { // Extend Mutation block
    ...resolvers.Mutation, // Keep existing mutations

    // Admin mutations (already present)
    updateUserRole: async (_parent: any, { userId, newRole }: { userId: string, newRole: UserRole }, context: Context) => {
      if (!context.user || context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Access denied. Admin role required to change user roles.');
      }
      if (!Object.values(UserRole).includes(newRole)) {
        throw new UserInputError(`Invalid role: ${newRole}`);
      }
      // Prevent admin from accidentally changing their own role or creating too many admins easily.
      // Specific checks might be needed (e.g., not demoting the last admin).
      // For now, a simple update:
      return context.prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
        include: { profile: true },
      });
    },
    adminSetCoursePublication: async (_parent: any, { courseId, isPublished }: { courseId: string, isPublished: boolean }, context: Context) => {
      if (!context.user || context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Access denied. Admin role required to change course publication status.');
      }
      const course = await context.prisma.course.findUnique({ where: { id: courseId } });
      if (!course) {
        throw new UserInputError('Course not found.');
      }
      // If publishing, might add checks here (e.g., course has content)
      return context.prisma.course.update({
        where: { id: courseId },
        data: { isPublished },
        include: { instructor: { include: { profile: true } }, category: true },
      });
    },

    updateUserProfile: async (_parent: any, { input }: { input: { firstName?: string, lastName?: string, bio?: string, avatarUrl?: string } }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated. Please log in to update your profile.');
      }

      const { firstName, lastName, bio, avatarUrl } = input;

      // Upsert ensures profile is created if it doesn't exist for the user
      const updatedProfile = await context.prisma.profile.upsert({
        where: { userId: context.user.id },
        update: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(bio !== undefined && { bio }),
          ...(avatarUrl !== undefined && { avatarUrl }),
        },
        create: {
          userId: context.user.id,
          firstName,
          lastName,
          bio,
          avatarUrl,
        },
      });
      return updatedProfile;
    },

    // --- Q&A Mutations ---
    askQuestion: async (_parent: any, { input }: { input: { lessonId: string, title?: string, content: string } }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in to ask a question.');
      }
      const { lessonId, title, content } = input;
      if (!content.trim()) {
        throw new UserInputError('Question content cannot be empty.');
      }

      // Check if lesson exists
      const lesson = await context.prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { section: { include: { course: true } } }
      });
      if (!lesson) {
        throw new UserInputError('Lesson not found.');
      }

      // Authorization: Check if user is enrolled in the course OR if the lesson is previewable
      // (or if user is instructor/admin - they can ask too for seeding/testing)
      let isEnrolled = false;
      if (context.user.role === UserRole.STUDENT) {
        const enrollment = await context.prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: context.user.id, courseId: lesson.section.courseId } }
        });
        isEnrolled = !!enrollment;
      } else if (context.user.role === UserRole.INSTRUCTOR || context.user.role === UserRole.ADMIN) {
        isEnrolled = true; // Instructors/Admins can always ask
      }

      if (!isEnrolled && !lesson.isPreviewable) {
         throw new ForbiddenError('You must be enrolled in this course to ask questions about this lesson.');
      }

      return context.prisma.question.create({
        data: {
          lessonId,
          title,
          content,
          userId: context.user.id,
        },
        include: { user: { include: { profile: true } }, answers: true, lesson: true }
      });
    },

    postAnswer: async (_parent: any, { input }: { input: { questionId: string, content: string } }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in to post an answer.');
      }
      const { questionId, content } = input;
      if (!content.trim()) {
        throw new UserInputError('Answer content cannot be empty.');
      }

      const question = await context.prisma.question.findUnique({
        where: { id: questionId },
        include: { lesson: { include: { section: { include: { course: true } } } } }
      });

      if (!question) {
        throw new UserInputError('Question not found.');
      }

      // Authorization: Only the course instructor or an admin can answer
      const courseInstructorId = question.lesson.section.course.instructorId;
      if (context.user.id !== courseInstructorId && context.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only the course instructor or an admin can answer questions.');
      }

      return context.prisma.answer.create({
        data: {
          questionId,
          content,
          userId: context.user.id,
        },
        include: { user: { include: { profile: true } }, question: true }
      });
    },

    // --- Review Mutation ---
    submitReview: async (_parent: any, { courseId, rating, comment }: { courseId: string, rating: number, comment?: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in to submit a review.');
      }
       if (context.user.role !== UserRole.STUDENT) {
         throw new ForbiddenError('Only students can submit reviews.');
      }

      if (rating < 1 || rating > 5) {
        throw new UserInputError('Rating must be between 1 and 5.');
      }

      // Check if user is enrolled in the course
      const enrollment = await context.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: context.user.id, courseId } }
      });
      if (!enrollment) {
        throw new ForbiddenError('You must be enrolled in this course to submit a review.');
      }
      // Optional: Add check for course completion or progress before allowing review
      // if (!enrollment.completedAt && (enrollment.progress || 0) < SOME_THRESHOLD) {
      //   throw new ForbiddenError('Please complete more of the course before submitting a review.');
      // }

      // Check if user has already reviewed this course (Prisma schema @@unique should also prevent this)
      const existingReview = await context.prisma.review.findUnique({
        where: { userId_courseId: { userId: context.user.id, courseId } }
      });
      if (existingReview) {
        throw new UserInputError('You have already reviewed this course.');
      }

      return context.prisma.review.create({
        data: {
          userId: context.user.id,
          courseId,
          rating,
          comment,
        },
        include: { user: { include: { profile: true } }, course: true }
      });
    },

    toggleBookmark: async (_parent: any, { lessonId }: { lessonId: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in to bookmark lessons.');
      }

      const lesson = await context.prisma.lesson.findUnique({ where: { id: lessonId } });
      if (!lesson) {
        throw new UserInputError('Lesson not found.');
      }

      const existingBookmark = await context.prisma.bookmark.findUnique({
        where: {
          userId_lessonId: {
            userId: context.user.id,
            lessonId: lessonId,
          },
        },
      });

      if (existingBookmark) {
        await context.prisma.bookmark.delete({
          where: { id: existingBookmark.id },
        });
      } else {
        await context.prisma.bookmark.create({
          data: {
            userId: context.user.id,
            lessonId: lessonId,
          },
        });
      }
      return context.prisma.lesson.findUnique({
          where: { id: lessonId },
          include: { section: { include: { course: true } } }
      });
    },

    createQuiz: async (_parent: any, { input }: { input: { lessonId: string, title: string, description?: string } }, context: Context) => {
      if (!context.user) throw new AuthenticationError('Not authenticated');
      const { lessonId, title, description } = input;

      const lesson = await context.prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { section: { include: { course: true } } }
      });
      if (!lesson) throw new UserInputError('Lesson not found.');

      // Authorization: User must be instructor of the course or Admin
      const instructorId = lesson.section.course.instructorId;
      if (context.user.role !== UserRole.ADMIN && context.user.id !== instructorId) {
        throw new ForbiddenError('You are not authorized to create a quiz for this lesson.');
      }

      // Check if a quiz already exists for this lesson (due to @unique on lessonId in Quiz model)
      const existingQuiz = await context.prisma.quiz.findUnique({ where: { lessonId } });
      if (existingQuiz) {
        throw new UserInputError('A quiz already exists for this lesson. You can edit the existing one.');
      }

      return context.prisma.quiz.create({
        data: {
          lessonId,
          title,
          description,
        },
        include: { lesson: true, questions: true }
      });
    },

    addQuestionToQuiz: async (_parent: any, { input }: { input: { quizId: string, text: string, type: QuestionType, order: number, options: { text: string, isCorrect?: boolean }[] } }, context: Context) => {
      if (!context.user) throw new AuthenticationError('Not authenticated');
      const { quizId, text, type, order, options } = input;

      const quiz = await context.prisma.quiz.findUnique({
        where: { id: quizId },
        include: { lesson: { include: { section: { include: { course: true } } } } }
      });
      if (!quiz) throw new UserInputError('Quiz not found.');

      // Authorization
      const instructorId = quiz.lesson.section.course.instructorId;
      if (context.user.role !== UserRole.ADMIN && context.user.id !== instructorId) {
        throw new ForbiddenError('You are not authorized to add questions to this quiz.');
      }

      if (!text.trim()) throw new UserInputError('Question text cannot be empty.');
      if (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
        if (!options || options.length < 2) throw new UserInputError('Multiple choice/True-False questions must have at least 2 options.');
        const correctOptionsCount = options.filter(opt => opt.isCorrect).length;
        if (type === 'MULTIPLE_CHOICE' && correctOptionsCount === 0) throw new UserInputError('At least one option must be marked as correct for multiple choice questions.');
        if (type === 'TRUE_FALSE' && (options.length !== 2 || correctOptionsCount !== 1)) throw new UserInputError('True/False questions must have exactly two options, one being correct.');
      }

      // @ts-ignore // Prisma enum vs GraphQL enum
      const questionTypeForDb: Prisma.QuestionType = type;


      return context.prisma.quizQuestion.create({
        data: {
          quizId,
          text,
          type: questionTypeForDb,
          order,
          options: {
            create: options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect || false }))
          }
        },
        include: { quiz: true, options: true }
      });
    },

    startQuizAttempt: async (_parent: any, { quizId }: { quizId: string }, context: Context) => {
        if (!context.user) throw new AuthenticationError('Not authenticated');

        const quiz = await context.prisma.quiz.findUnique({
            where: { id: quizId },
            include: { lesson: {include: {section: { include: { course: true }}}}}
        });
        if (!quiz) throw new UserInputError('Quiz not found.');

        // Ensure user is enrolled (unless they are instructor/admin, who might "test" a quiz)
        if (context.user.role === UserRole.STUDENT) {
            const enrollment = await context.prisma.enrollment.findUnique({
                where: { userId_courseId: { userId: context.user.id, courseId: quiz.lesson.section.course.id } }
            });
            if (!enrollment) throw new ForbiddenError('You must be enrolled in the course to attempt this quiz.');
        }

        // Optional: Check for previous incomplete attempts or limits on attempts. For now, allow multiple.

        return context.prisma.quizAttempt.create({
            data: {
                quizId,
                userId: context.user.id,
                // startedAt is default now()
            },
            include: { quiz: true, user: {include: {profile: true}}, studentAnswers: true }
        });
    },

    submitStudentAnswer: async (_parent: any, { input }: { input: { attemptId: string, questionId: string, selectedOptionId?: string, answerText?: string } }, context: Context) => {
        if (!context.user) throw new AuthenticationError('Not authenticated');
        const { attemptId, questionId, selectedOptionId, answerText } = input;

        const attempt = await context.prisma.quizAttempt.findUnique({ where: { id: attemptId } });
        if (!attempt || attempt.userId !== context.user.id) {
            throw new ForbiddenError('Invalid attempt or not your attempt.');
        }
        if (attempt.completedAt) {
            throw new UserInputError('This quiz attempt has already been completed.');
        }

        const question = await context.prisma.quizQuestion.findUnique({
            where: { id: questionId },
            include: { options: true }
        });
        if (!question || question.quizId !== attempt.quizId) {
            throw new UserInputError('Question not found in this quiz.');
        }

        let isAnswerCorrect: boolean | undefined = undefined;
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
            if (!selectedOptionId) throw new UserInputError('An option must be selected for this question type.');
            const chosenOption = question.options.find(opt => opt.id === selectedOptionId);
            if (!chosenOption) throw new UserInputError('Selected option is invalid.');
            isAnswerCorrect = chosenOption.isCorrect;
        } else if (question.type === 'SHORT_ANSWER') {
            // Grading for short answer would be manual or more complex, not implemented here
            // For now, store the text, isCorrect remains null/undefined
        }

        // Upsert to allow changing an answer within the same attempt before finishing
        return context.prisma.studentAnswer.upsert({
            where: { attemptId_questionId: { attemptId, questionId } },
            update: { selectedOptionId, answerText, isCorrect: isAnswerCorrect },
            create: {
                attemptId,
                questionId,
                selectedOptionId,
                answerText,
                isCorrect: isAnswerCorrect
            },
            include: { attempt: true, question: true, selectedOption: true }
        });
    },

    finishQuizAttempt: async (_parent: any, { attemptId }: { attemptId: string }, context: Context) => {
        if (!context.user) throw new AuthenticationError('Not authenticated');

        const attempt = await context.prisma.quizAttempt.findUnique({
            where: { id: attemptId },
            include: {
                studentAnswers: { include: { question: { include: { options: true } } } },
                quiz: { include: { questions: true } }
            }
        });

        if (!attempt || attempt.userId !== context.user.id) {
            throw new ForbiddenError('Invalid attempt or not your attempt.');
        }
        if (attempt.completedAt) {
            throw new UserInputError('This quiz attempt has already been completed and graded.');
        }

        let correctAnswersCount = 0;
        for (const studentAnswer of attempt.studentAnswers) {
            // Re-verify correctness based on stored QuestionOption.isCorrect
            // This is important if isCorrect was not set on StudentAnswer or needs re-validation
            const question = studentAnswer.question;
            if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
                const correctOption = question.options.find(opt => opt.isCorrect);
                if (correctOption && studentAnswer.selectedOptionId === correctOption.id) {
                    correctAnswersCount++;
                    // Optionally update studentAnswer.isCorrect if not already set
                    if (studentAnswer.isCorrect === null || studentAnswer.isCorrect === undefined) {
                        await context.prisma.studentAnswer.update({
                            where: { id: studentAnswer.id },
                            data: { isCorrect: true }
                        });
                    }
                } else {
                     if (studentAnswer.isCorrect === null || studentAnswer.isCorrect === undefined) {
                        await context.prisma.studentAnswer.update({
                            where: { id: studentAnswer.id },
                            data: { isCorrect: false }
                        });
                    }
                }
            }
            // Add logic for other question types if implemented
        }

        const totalQuestions = attempt.quiz.questions.length;
        const score = totalQuestions > 0 ? (correctAnswersCount / totalQuestions) * 100 : 0;

        return context.prisma.quizAttempt.update({
            where: { id: attemptId },
            data: {
                completedAt: new Date(),
                score: parseFloat(score.toFixed(2))
            },
            include: { quiz: true, user: {include: {profile: true}}, studentAnswers: { include: { selectedOption: true, question: {include: {options: true}}}}}
        });
    },

    getMockUploadUrl: async (_parent: any, { filename, fileType }: { filename: string, fileType: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in to get an upload URL.');
      }
      // In a real application, this would:
      // 1. Validate filename and fileType.
      // 2. Potentially generate a unique filename or path.
      // 3. Interact with a cloud storage service (S3, GCS, Azure Blob) to get a presigned URL for upload.
      // 4. Or, if uploading directly to server first, prepare a path.

      // For this mock, we just return a placeholder URL.
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, ''); // Basic sanitization
      const mockUrl = `https://example.com/uploads/placeholder-${Date.now()}-${sanitizedFilename}`;
      console.log(`Mock URL generated for ${filename} (type: ${fileType}): ${mockUrl}`);
      return mockUrl;
    },

    toggleLessonCompleted: async (
      _parent: any,
      { lessonId, courseId, completed }: { lessonId: string, courseId: string, completed: boolean },
      context: Context
    ) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated.');
      }

      // 1. Verify enrollment
      const enrollment = await context.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: context.user.id, courseId: courseId } },
        include: { course: { include: { sections: { include: { lessons: true } } } } } // Include all lessons for progress calc
      });

      if (!enrollment) {
        throw new ForbiddenError('You are not enrolled in this course.');
      }

      // 2. Verify lesson exists in the course (optional, but good for data integrity)
      const lessonExistsInCourse = enrollment.course.sections.some(section =>
        section.lessons.some(lesson => lesson.id === lessonId)
      );
      if (!lessonExistsInCourse) {
        throw new UserInputError('Lesson not found in this course.');
      }

      // 3. Update completedLessons array
      let updatedCompletedLessons = [...enrollment.completedLessons];
      if (completed) { // Mark as completed
        if (!updatedCompletedLessons.includes(lessonId)) {
          updatedCompletedLessons.push(lessonId);
        }
      } else { // Mark as incomplete
        updatedCompletedLessons = updatedCompletedLessons.filter(id => id !== lessonId);
      }

      // 4. Recalculate progress
      const totalLessonsInCourse = enrollment.course.sections.reduce((count, section) => count + section.lessons.length, 0);
      const newProgress = totalLessonsInCourse > 0
        ? (updatedCompletedLessons.length / totalLessonsInCourse) * 100
        : 0;

      // 5. Update enrollment record
      return context.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          completedLessons: updatedCompletedLessons,
          progress: parseFloat(newProgress.toFixed(2)), // Store with 2 decimal places
          completedAt: newProgress >= 100 ? new Date() : null // Mark course completed if 100%
        },
        include: {
            user: { include: { profile: true } },
            course: true // Or more detailed course if needed by client on this mutation
        }
      });
    }
  },

  // --- Relational Resolvers (Type Resolvers) ---
  // These resolve fields on types if they are not directly available or need custom logic.
  // Prisma's `include` often handles this, but explicit resolvers are good for clarity or complex cases.

  User: {
    // Example: if you wanted to fetch courses for an instructor user separately
    // courses: async (parent: { id: string; role: UserRole }, _args: any, context: Context) => {
    //   if (parent.role === UserRole.INSTRUCTOR) {
    //     return context.prisma.course.findMany({ where: { instructorId: parent.id } });
    //   }
    //   return []; // Or null
    // },
    profile: async (parent: { id: string }, _args: any, context: Context) => {
      return context.prisma.profile.findUnique({ where: { userId: parent.id } });
    },
  },

  Course: {
    instructor: async (parent: { instructorId: string }, _args: any, context: Context) => {
      return context.prisma.user.findUnique({ where: { id: parent.instructorId }, include: { profile: true } });
    },
    sections: async (parent: { id: string }, _args: any, context: Context) => {
      return context.prisma.section.findMany({ where: { courseId: parent.id }, orderBy: { order: 'asc' }, include: { lessons: { orderBy: {order: 'asc'}}} });
    },
    enrollments: async (parent: { id: string }, _args: any, context: Context) => {
      return context.prisma.enrollment.findMany({ where: { courseId: parent.id }, include: {user: {include: {profile: true}}} });
    },
    reviews: async (parent: { id: string }, _args: any, context: Context) => {
      return context.prisma.review.findMany({ where: { courseId: parent.id }, include: {user: {include: {profile: true}}} });
    },
    category: async (parent: { categoryId?: string | null }, _args: any, context: Context) => {
      if (!parent.categoryId) return null;
      return context.prisma.category.findUnique({ where: { id: parent.categoryId } });
    },
    _count: async (parent: { id: string }, _args: any, context: Context) => {
        // This resolver is needed if _count is not directly fetched by Prisma `include` in parent.
        // However, Prisma's `include: { _count: { select: { enrollments: true, lessons: true } } }` in the
        // getAllCourses resolver should already populate this.
        // If for some reason it's not populated, or if you need to calculate it differently:
        const enrollmentsCount = await context.prisma.enrollment.count({ where: { courseId: parent.id } });
        const lessonsCount = await context.prisma.lesson.count({ where: { section: { courseId: parent.id } } });
        return { enrollments: enrollmentsCount, lessons: lessonsCount };
    },
    averageRating: async (parent: { id: string, reviews?: {rating: number}[] }, _args: any, context: Context) => {
        // If reviews are already included (as they are in getAllCourses for this calculation)
        if (parent.reviews && parent.reviews.length > 0) {
            const sum = parent.reviews.reduce((acc, review) => acc + review.rating, 0);
            return parseFloat((sum / parent.reviews.length).toFixed(1));
        }
        // Fallback if reviews were not pre-fetched (less efficient)
        const reviews = await context.prisma.review.findMany({
            where: { courseId: parent.id },
            select: { rating: true }
        });
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
        return parseFloat((sum / reviews.length).toFixed(1));
    }
  },

  Section: {
    course: async (parent: { courseId: string }, _args: any, context: Context) => {
      return context.prisma.course.findUnique({ where: { id: parent.courseId } });
    },
    lessons: async (parent: { id: string }, _args: any, context: Context) => {
      return context.prisma.lesson.findMany({ where: { sectionId: parent.id }, orderBy: { order: 'asc' } });
    }
  },

  Lesson: {
    section: async (parent: { sectionId: string }, _args: any, context: Context) => {
      return context.prisma.section.findUnique({ where: { id: parent.sectionId } });
    },
    quizId: async (parent: { id: string }, _args: any, context: Context) => {
      const quiz = await context.prisma.quiz.findUnique({
        where: { lessonId: parent.id },
        select: { id: true }
      });
      return quiz ? quiz.id : null;
    },
    isBookmarked: async (parent: { id: string }, _args: any, context: Context): Promise<boolean> => {
      if (!context.user) return false;
      const bookmark = await context.prisma.bookmark.findUnique({
        where: {
          userId_lessonId: {
            userId: context.user.id,
            lessonId: parent.id,
          },
        },
      });
      return !!bookmark;
    }
  },

  Category: {
    courses: async (parent: { id: string }, _args: any, context: Context) => {
      return context.prisma.course.findMany({ where: { categoryId: parent.id, isPublished: true } });
    }
  },

  Enrollment: {
    user: async (parent: { userId: string }, _args: any, context: Context) => {
      return context.prisma.user.findUnique({ where: { id: parent.userId }, include: {profile: true} });
    },
    course: async (parent: { courseId: string }, _args: any, context: Context) => {
      return context.prisma.course.findUnique({ where: { id: parent.courseId } });
    }
  },

  Review: {
    user: async (parent: { userId: string }, _args: any, context: Context) => {
      return context.prisma.user.findUnique({ where: { id: parent.userId }, include: {profile: true} });
    },
    course: async (parent: { courseId: string }, _args: any, context: Context) => {
      return context.prisma.course.findUnique({ where: { id: parent.courseId } });
    }
  },

  Question: {
    user: async (parent: { userId: string }, _args: any, context: Context) => {
      return context.prisma.user.findUnique({ where: { id: parent.userId }, include: { profile: true } });
    },
    lesson: async (parent: { lessonId: string }, _args: any, context: Context) => {
      return context.prisma.lesson.findUnique({ where: { id: parent.lessonId } });
    },
    answers: async (parent: { id: string }, _args: any, context: Context) => {
      return context.prisma.answer.findMany({
        where: { questionId: parent.id },
        include: { user: { include: { profile: true } } },
        orderBy: { createdAt: 'asc' }
      });
    }
  },

  Answer: {
    user: async (parent: { userId: string }, _args: any, context: Context) => {
      return context.prisma.user.findUnique({ where: { id: parent.userId }, include: { profile: true } });
    },
    question: async (parent: { questionId: string }, _args: any, context: Context) => {
      return context.prisma.question.findUnique({ where: { id: parent.questionId } });
    }
  }
};
