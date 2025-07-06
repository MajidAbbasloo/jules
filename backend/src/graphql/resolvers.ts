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
    getAllCourses: async (_parent: any, { publishedOnly = true }: { publishedOnly?: boolean }, context: Context) => {
      return context.prisma.course.findMany({
        where: publishedOnly ? { isPublished: true } : {},
        include: {
          instructor: { include: { profile: true } },
          category: true,
          // sections: true, // Avoid deep nesting in list views for performance
          // reviews: true,
        },
        orderBy: { createdAt: 'desc' },
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
  }
};
