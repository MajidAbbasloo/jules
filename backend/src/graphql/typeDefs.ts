import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime
  scalar Json # For lesson resources if using Json type

  enum UserRole {
    STUDENT
    INSTRUCTOR
    ADMIN
  }

  type User {
    id: ID!
    email: String!
    role: UserRole!
    isEmailVerified: Boolean!
    profile: Profile
    # courses: [Course!] # Courses taught by this user (if instructor) - Handled by specific query
    # enrollments: [Enrollment!] # Courses enrolled by this user (if student) - Handled by specific query
    createdAt: DateTime!
  }

  type Profile {
    id: ID!
    firstName: String
    lastName: String
    bio: String
    avatarUrl: String
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
    courses: [Course!] # Courses in this category
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Course {
    id: ID!
    title: String!
    description: String
    price: Float
    thumbnailUrl: String
    tags: [String!]
    level: CourseLevel
    language: String
    isPublished: Boolean!
    instructor: User! # The instructor of the course
    sections: [Section!] # Sections within the course
    enrollments: [Enrollment!] # Enrollments for this course
    reviews: [Review!] # Reviews for this course
    category: Category
    createdAt: DateTime!
    updatedAt: DateTime!
    # Add _count for enrollments and averageRating for sorting
    _count: CourseCounts
    averageRating: Float
  }

  type CourseCounts {
    enrollments: Int
    lessons: Int # Example, if needed
  }


  type Section {
    id: ID!
    title: String!
    order: Int!
    lessons: [Lesson!] # Lessons within this section
    course: Course! # The course this section belongs to
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Lesson {
    id: ID!
    title: String!
    content: String # Markdown, text, or video metadata link
    videoUrl: String
    duration: Int # in seconds or minutes
    order: Int!
    isPreviewable: Boolean!
    section: Section! # The section this lesson belongs to
    resources: Json # e.g., [{ title: "Slide Deck", url: "..." }]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Enrollment {
    id: ID!
    user: User!
    course: Course!
    enrolledAt: DateTime!
    progress: Float! # Make progress non-nullable, defaults to 0
    completedLessons: [ID!]! # List of completed lesson IDs
    completedAt: DateTime
  }

  type Review {
    id: ID!
    rating: Int!
    comment: String
    user: User! # User who wrote the review
    course: Course! # Course being reviewed
    createdAt: DateTime!
  }

  # --- Input Types ---

  input RegisterInput {
    email: String!
    password: String!
    firstName: String
    lastName: String
    role: UserRole # Optional, defaults to STUDENT if not provided by admin/specific logic
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateCourseInput {
    title: String!
    description: String
    price: Float
    thumbnailUrl: String
    tags: [String!]
    categoryId: ID
  }

  input UpdateCourseInput {
    title: String
    description: String
    price: Float
    thumbnailUrl: String
    tags: [String!]
    isPublished: Boolean
    categoryId: ID
  }

  input CreateSectionInput {
    title: String!
    order: Int!
    courseId: ID!
  }

  input UpdateSectionInput {
    title: String
    order: Int
  }

  input CreateLessonInput {
    title: String!
    content: String
    videoUrl: String
    duration: Int
    order: Int!
    isPreviewable: Boolean
    sectionId: ID!
    resources: Json
  }

  input UpdateLessonInput {
    title: String
    content: String
    videoUrl: String
    duration: Int
    order: Int
    isPreviewable: Boolean
    resources: Json
  }


  # --- Payload Types ---

  type AuthPayload {
    token: String!
    user: User!
  }

  # --- Queries ---

  type Query {
    # User
    me: User # Get the currently authenticated user

    # Course
    getCourseById(id: ID!): Course
    getAllCourses( # Renaming to searchCourses or keeping as getAllCourses with more filters
        publishedOnly: Boolean = true
        searchQuery: String
        categoryIds: [ID!]
        levels: [CourseLevel!]
        priceMin: Float
        priceMax: Float
        languages: [String!]
        sortBy: CourseSortBy
        # TODO: Add pagination (skip, take)
    ): [Course!]
    getCoursesByCategory(categoryId: ID!, publishedOnly: Boolean = true): [Course!] # Keep for specific category pages if simpler

    # Category
    getAllCategories: [Category!]
    getCategoryById(id: ID!): Category
    getCategoryBySlug(slug: String!): Category # For the category page header
    getCoursesByCategorySlug(slug: String!, publishedOnly: Boolean = true): [Course!] # For listing courses on category page

    # TODO: Add more specific queries for sections, lessons if needed directly
  }

  # --- Mutations ---

  type Mutation {
    # Auth
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    # TODO: Add mutations for email verification, password reset, etc.

    # Course Management (Instructor/Admin)
    createCourse(input: CreateCourseInput!): Course!
    updateCourse(id: ID!, input: UpdateCourseInput!): Course!
    deleteCourse(id: ID!): Course # Or return boolean/ID
    publishCourse(id: ID!): Course!
    unpublishCourse(id: ID!): Course!

    # Section Management (Instructor/Admin)
    createSection(input: CreateSectionInput!): Section!
    updateSection(id: ID!, input: UpdateSectionInput!): Section!
    deleteSection(id: ID!): Section

    # Lesson Management (Instructor/Admin)
    createLesson(input: CreateLessonInput!): Lesson!
    updateLesson(id: ID!, input: UpdateLessonInput!): Lesson!
    deleteLesson(id: ID!): Lesson

    # Category Management (Admin)
    createCategory(name: String!, slug: String!, description: String): Category!
    updateCategory(id: ID!, name: String, slug: String, description: String): Category!
    deleteCategory(id: ID!): Category

    # Enrollment
    enrollInCourse(courseId: ID!): Enrollment!

    # TODO: Review mutations
    # leaveReview(courseId: ID!, rating: Int!, comment: String): Review!
  }

  extend type Query {
    # Get courses a student is enrolled in
    getMyEnrolledCourses: [Enrollment!]
    isEnrolled(courseId: ID!): Boolean!

    # Admin queries
    getAllUsers: [User!] # Admin access
    getAllCoursesForAdmin(publishedOnly: Boolean): [Course!] # Admin access, optional filter

    # Enrollment specific query for a user
    getMyEnrollmentForCourse(courseId: ID!): Enrollment # Returns single enrollment or null

    # Q&A Queries
    getQuestionsForLesson(lessonId: ID!): [Question!]

    # Admin Dashboard Stats
    getTotalUsersCount: Int!
    getTotalCoursesCount: Int!
    getTotalCategoriesCount: Int!
  }

  enum CourseLevel {
    BEGINNER
    INTERMEDIATE
    ADVANCED
    ALL_LEVELS
  }

  enum CourseSortBy {
    NEWEST
    POPULARITY # by enrollments count
    HIGHEST_RATED
    # TITLE_ASC
    # TITLE_DESC
  }

  type Question {
    id: ID!
    title: String
    content: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    lesson: Lesson! # Should resolve to the lesson it belongs to
    user: User! # User who asked
    answers: [Answer!] # Answers to this question
  }

  type Answer {
    id: ID!
    content: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    question: Question! # Question this answer belongs to
    user: User! # User who answered
  }

  input AskQuestionInput {
    lessonId: ID!
    title: String
    content: String!
  }

  input PostAnswerInput {
    questionId: ID!
    content: String!
  }

  extend type Mutation {
    # Admin mutations
    updateUserRole(userId: ID!, newRole: UserRole!): User! # Admin access
    adminSetCoursePublication(courseId: ID!, isPublished: Boolean!): Course! # Admin access

    # Q&A Mutations
    askQuestion(input: AskQuestionInput!): Question!
    postAnswer(input: PostAnswerInput!): Answer!
    # TODO: Add edit/delete mutations for Question and Answer if time permits
    # editQuestion(id: ID!, title: String, content: String): Question
    # deleteQuestion(id: ID!): Boolean
    # editAnswer(id: ID!, content: String): Answer
    # deleteAnswer(id: ID!): Boolean

    # Mock File Upload
    getMockUploadUrl(filename: String!, fileType: String!): String!

    # Progress Tracking
    toggleLessonCompleted(lessonId: ID!, courseId: ID!, completed: Boolean!): Enrollment!

    # User Profile
    updateUserProfile(input: UpdateUserProfileInput!): Profile!
  }

  input UpdateUserProfileInput {
    firstName: String
    lastName: String
    bio: String
    avatarUrl: String # Can be a mock URL from getMockUploadUrl
  }
`;
