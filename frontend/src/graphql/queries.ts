import { gql } from '@apollo/client';

export const GET_ME_WITH_COURSES = gql`
  query GetMeWithCourses {
    me {
      id
      email
      role
      profile {
        firstName
        lastName
      }
      # We will fetch courses via a separate query for the instructor dashboard
    }
  }
`;

export const GET_MY_BOOKMARKED_LESSONS = gql`
  query GetMyBookmarkedLessons {
    getMyBookmarkedLessons {
      id
      title
      isPreviewable
      # quizId # If needed to link to quiz from bookmarks page
      section {
        id
        title
        course {
          id
          title
        }
      }
    }
  }
`;

export const GET_QUIZ_FOR_STUDENT = gql`
  query GetQuizForStudent($quizId: ID!) {
    getQuizForStudent(quizId: $quizId) { # Uses QuizForStudent type from backend
      id
      title
      description
      lesson {
        id
        title
      }
      questions { # QuizQuestionForStudent
        id
        text
        type # QuestionTypeGQL
        order
        options { # QuestionOptionForStudent (no isCorrect)
          id
          text
        }
      }
    }
  }
`;

export const GET_QUESTIONS_FOR_LESSON = gql`
  query GetQuestionsForLesson($lessonId: ID!) {
    getQuestionsForLesson(lessonId: $lessonId) {
      id
      title
      content
      createdAt
      user { # User who asked
        id
        email
        profile {
          firstName
          lastName
        }
      }
      answers {
        id
        content
        createdAt
        user { # User who answered
          id
          email
          profile {
            firstName
            lastName
          }
        }
      }
    }
  }
`;

export const GET_CATEGORY_BY_SLUG = gql`
  query GetCategoryBySlug($slug: String!) {
    getCategoryBySlug(slug: $slug) {
      id
      name
      description
    }
  }
`;

export const GET_COURSES_BY_CATEGORY_SLUG = gql`
  query GetCoursesByCategorySlug($slug: String!, $publishedOnly: Boolean) {
    getCoursesByCategorySlug(slug: $slug, publishedOnly: $publishedOnly) {
      id
      title
      description
      thumbnailUrl
      price
      instructor {
        id
        profile {
          firstName
          lastName
        }
      }
      category { # Though we are on category page, it's good for consistency / card component
        id
        name
      }
    }
  }
`;

export const GET_ALL_COURSES_FOR_ADMIN_VIEW = gql`
  query GetAllCoursesForAdminView($publishedOnly: Boolean) {
    getAllCoursesForAdmin(publishedOnly: $publishedOnly) { # Uses the backend query
      id
      title
      isPublished
      price
      instructor {
        id
        email
        profile {
          firstName
          lastName
        }
      }
      category {
        id
        name
      }
      createdAt
      updatedAt
      _count { # Example of fetching counts if needed
        enrollments
      }
    }
  }
`;

export const GET_REVIEWS_FOR_COURSE = gql`
  query GetReviewsForCourse($courseId: ID!) {
    # Assuming the backend resolver for Course.reviews or a dedicated getReviewsForCourse query exists
    # If it's on Course type:
    # getCourseById(id: $courseId) {
    #   id
    #   reviews {
    #     id
    #     rating
    #     comment
    #     createdAt
    #     user { id email profile { firstName lastName } }
    #   }
    # }
    # If it's a top-level query (as implemented in backend step):
    getReviewsForCourse(courseId: $courseId) {
      id
      rating
      comment
      createdAt
      user {
        id
        email
        profile {
          firstName
          lastName
        }
      }
    }
  }
`;


export const GET_ALL_USERS_FOR_ADMIN = gql`
  query GetAllUsersForAdmin {
    getAllUsers { # Assuming this is the admin-only query
      id
      email
      role
      isEmailVerified
      createdAt
      profile {
        firstName
        lastName
      }
    }
  }
`;

export const IS_ENROLLED_QUERY = gql`
  query IsEnrolled($courseId: ID!) {
    isEnrolled(courseId: $courseId)
  }
`;

export const GET_MY_ENROLLED_COURSES = gql`
  query GetMyEnrolledCourses {
    getMyEnrolledCourses {
      id # Enrollment ID
      enrolledAt
      progress
      completedLessons # Add this field
      course {
        id
        title
        thumbnailUrl
        description
        instructor {
          id
          profile {
            firstName
            lastName
          }
        }
        category {
          id
          name
        }
        # _count { sections lessons } // If needed for display
      }
    }
  }
`;

export const GET_MY_ENROLLMENT_FOR_COURSE = gql`
  query GetMyEnrollmentForCourse($courseId: ID!) {
    # This query might not exist on backend, we might need to implement it
    # or filter from getMyEnrolledCourses on client.
    # For now, assuming it exists or will be added:
    # getMyEnrollmentForCourse(courseId: $courseId) {
    #   id
    #   progress
    #   completedLessons
    # }
    # Alternative: use isEnrolled and if true, then fetch getMyEnrolledCourses and filter.
    # For robust solution, backend should provide this.
    # For now, let's use a placeholder structure and adapt if needed.
    # We'll actually rely on the IS_ENROLLED_QUERY and then fetch the specific enrollment data if needed,
    # or better, ensure GET_MY_ENROLLED_COURSES is used and we find the current course from its result.
    # To keep it simple for now, I will fetch all enrolled courses and filter.
    # The LearningPage already has IS_ENROLLED_QUERY.
    # We'll fetch the *specific* enrollment for progress.
    # A new backend query `getMyEnrollment(courseId: ID!)` would be best.

    # Let's define what the ideal new query would look like,
    # and the backend would need to implement it.
    # For now, the LearningPage will use IS_ENROLLED_QUERY and then
    # this new query if the user is enrolled.
    getMyEnrollmentForCourse(courseId: $courseId) { # Assumes this new query on backend
        id
        progress
        completedLessons
        completedAt
    }
  }
`;

export const GET_QUIZ_FOR_INSTRUCTOR = gql`
  query GetQuizForInstructor($quizId: ID!) {
    getQuizForInstructor(quizId: $quizId) {
      id
      title
      description
      lesson {
        id
        title
      }
      questions {
        id
        text
        type # QuestionTypeGQL
        order
        options {
          id
          text
          isCorrect
        }
      }
    }
  }
`;

// Placeholder query, actual implementation might vary based on backend
export const GET_LESSON_DETAILS_FOR_QUIZ = gql`
  query GetLessonDetailsForQuiz($lessonId: ID!) {
    # This is a conceptual query. The backend might return lesson details
    # and an associated quizId or the full quiz object if the user is instructor/admin.
    # Example structure:
    getLessonById(id: $lessonId) { # Assuming a getLessonById query exists or can be added
      id
      title
      # Potentially include quizId here if that's how it's modeled:
      # quiz { id }
      # Or, if the quiz is directly nested for instructors:
      # quizForInstructor { id title description questions { id text type order options { id text isCorrect } } }
    }
  }
`;


export const GET_INSTRUCTOR_COURSES = gql`
  query GetInstructorCourses($instructorId: ID!) {
    # This query doesn't exist yet on backend.
    # We'll need to add a query like getCoursesByInstructor(instructorId: ID!)
    # For now, let's assume an admin/instructor can see all their courses,
    # or we fetch all courses and filter on client (not ideal for many courses)
    # A better approach is a dedicated backend resolver.
    # Using getAllCourses and filtering by instructorId on client as a temporary measure if needed,
    # or ideally, the backend would provide a getMyCourses query for instructors.
    # Let's define a hypothetical getMyCourses for now.

    # Hypothetical query, assuming backend adds it or we adjust:
    # getMyCourses { # Fetches courses for the currently authenticated instructor
    #   id
    #   title
    #   isPublished
    #   price
    #   category {
    #     id
    #     name
    #   }
    #   sections {
    #     id
    #     title
    #     lessons {
    #       id
    #       title
    #     }
    #   }
    #   enrollments { # Just count for list view
    #    id
    #   }
    #   updatedAt
    # }

    # Using getAllCourses for now and will filter on client or adjust if backend adds specific query.
    # This is not ideal for production due to over-fetching.
    getAllCourses(publishedOnly: false) { # Fetch all, published or not, for instructor
      id
      title
      description
      price
      thumbnailUrl
      tags
      isPublished
      instructor {
        id # Needed for client-side filtering if using getAllCourses
        email
        profile {
          firstName
          lastName
        }
      }
      category {
        id
        name
      }
      sections {
        id
        title
        order
        lessons {
          id
          title
          order
        }
      }
      enrollments {
       id
      }
      reviews {
        id
        rating
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_COURSE_DETAILS_FOR_EDIT = gql`
  query GetCourseDetailsForEdit($id: ID!) {
    getCourseById(id: $id) {
      id
      title
      description
      price
      thumbnailUrl
      tags
      isPublished
      categoryId: category { # Alias category.id to categoryId for form binding
        id
      }
      # For editing, we might also need full section/lesson details
      sections(orderBy: { order: "asc" }) {
        id
        title
        order
        lessons(orderBy: { order: "asc" }) {
          id
          title
          content
          videoUrl
          duration
          order
          isPreviewable
          resources
          quizId
          isBookmarked # Fetch bookmark status for current user
        }
      }
    }
  }
`;

export const GET_ALL_CATEGORIES = gql`
  query GetAllCategories {
    getAllCategories {
      id
      name
      slug
    }
  }
`;
