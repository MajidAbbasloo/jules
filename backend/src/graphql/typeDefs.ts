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
    isPublished: Boolean!
    instructor: User! # The instructor of the course
    sections: [Section!] # Sections within the course
    enrollments: [Enrollment!] # Enrollments for this course
    reviews: [Review!] # Reviews for this course
    category: Category
    createdAt: DateTime!
    updatedAt: DateTime!
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
    progress: Float
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
    getAllCourses(publishedOnly: Boolean = true): [Course!]
    getCoursesByCategory(categoryId: ID!, publishedOnly: Boolean = true): [Course!]
    # TODO: Add searchCourses, getCoursesByInstructor, etc.

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
  }

  extend type Mutation {
    # Admin mutations
    updateUserRole(userId: ID!, newRole: UserRole!): User! # Admin access
    adminSetCoursePublication(courseId: ID!, isPublished: Boolean!): Course! # Admin access
  }
`;
