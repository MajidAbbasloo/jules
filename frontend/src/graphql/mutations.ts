import { gql } from '@apollo/client';

// --- Auth Mutations ---
export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      token
      user {
        id
        email
        role
        isEmailVerified # Ensure this is queried
        profile {
          firstName
          lastName
        }
      }
    }
  }
`;

// --- Enrollment Mutations ---
export const ENROLL_IN_COURSE_MUTATION = gql`
  mutation EnrollInCourse($courseId: ID!) {
    enrollInCourse(courseId: $courseId) {
      id # Enrollment ID
      enrolledAt
      course {
        id
        title
      }
      user {
        id
        email
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $password: String!, $firstName: String, $lastName: String, $role: UserRole) {
    register(input: { email: $email, password: $password, firstName: $firstName, lastName: $lastName, role: $role }) {
      token
      user {
        id
        email
        role
        isEmailVerified # Ensure this is queried
        profile {
          firstName
          lastName
        }
      }
    }
  }
`;

// --- Course Mutations ---
export const CREATE_COURSE_MUTATION = gql`
  mutation CreateCourse($title: String!, $description: String, $price: Float, $thumbnailUrl: String, $tags: [String!], $categoryId: ID) {
    createCourse(input: {
      title: $title,
      description: $description,
      price: $price,
      thumbnailUrl: $thumbnailUrl,
      tags: $tags,
      categoryId: $categoryId
    }) {
      id
      title
      description
      price
      isPublished
      category {
        id
        name
      }
    }
  }
`;

export const UPDATE_COURSE_MUTATION = gql`
  mutation UpdateCourse($id: ID!, $title: String, $description: String, $price: Float, $thumbnailUrl: String, $tags: [String!], $isPublished: Boolean, $categoryId: ID) {
    updateCourse(id: $id, input: {
      title: $title,
      description: $description,
      price: $price,
      thumbnailUrl: $thumbnailUrl,
      tags: $tags,
      isPublished: $isPublished,
      categoryId: $categoryId
    }) {
      id
      title
      description
      price
      thumbnailUrl
      tags
      isPublished
      category {
        id
        name
      }
      # Add sections and lessons if needed to update cache
    }
  }
`;

export const DELETE_COURSE_MUTATION = gql`
  mutation DeleteCourse($id: ID!) {
    deleteCourse(id: $id) {
      id # Return ID of deleted course for cache update
    }
  }
`;

export const PUBLISH_COURSE_MUTATION = gql`
  mutation PublishCourse($id: ID!) {
    publishCourse(id: $id) {
      id
      isPublished
    }
  }
`;

export const UNPUBLISH_COURSE_MUTATION = gql`
  mutation UnpublishCourse($id: ID!) {
    unpublishCourse(id: $id) {
      id
      isPublished
    }
  }
`;


// --- Section Mutations ---
export const CREATE_SECTION_MUTATION = gql`
  mutation CreateSection($title: String!, $order: Int!, $courseId: ID!) {
    createSection(input: { title: $title, order: $order, courseId: $courseId }) {
      id
      title
      order
      course {
        id # For cache updates
      }
      lessons { # Initialize with empty lessons array
        id
      }
    }
  }
`;

export const UPDATE_SECTION_MUTATION = gql`
  mutation UpdateSection($id: ID!, $title: String, $order: Int) {
    updateSection(id: $id, input: { title: $title, order: $order }) {
      id
      title
      order
    }
  }
`;

export const DELETE_SECTION_MUTATION = gql`
  mutation DeleteSection($id: ID!) {
    deleteSection(id: $id) {
      id
    }
  }
`;

// --- Lesson Mutations ---
export const CREATE_LESSON_MUTATION = gql`
  mutation CreateLesson(
    $title: String!,
    $order: Int!,
    $sectionId: ID!,
    $content: String,
    $videoUrl: String,
    $duration: Int,
    $isPreviewable: Boolean,
    $resources: Json
  ) {
    createLesson(input: {
      title: $title,
      order: $order,
      sectionId: $sectionId,
      content: $content,
      videoUrl: $videoUrl,
      duration: $duration,
      isPreviewable: $isPreviewable,
      resources: $resources
    }) {
      id
      title
      order
      content
      videoUrl
      duration
      isPreviewable
      resources
      section {
        id # For cache updates
      }
    }
  }
`;

export const UPDATE_LESSON_MUTATION = gql`
  mutation UpdateLesson(
    $id: ID!,
    $title: String,
    $order: Int,
    $content: String,
    $videoUrl: String,
    $duration: Int,
    $isPreviewable: Boolean,
    $resources: Json
  ) {
    updateLesson(id: $id, input: {
      title: $title,
      order: $order,
      content: $content,
      videoUrl: $videoUrl,
      duration: $duration,
      isPreviewable: $isPreviewable,
      resources: $resources
    }) {
      id
      title
      order
      content
      videoUrl
      duration
      isPreviewable
      resources
    }
  }
`;

export const DELETE_LESSON_MUTATION = gql`
  mutation DeleteLesson($id: ID!) {
    deleteLesson(id: $id) {
      id
    }
  }
`;

// --- Admin Mutations ---
export const UPDATE_USER_ROLE_MUTATION = gql`
  mutation UpdateUserRole($userId: ID!, $newRole: UserRole!) {
    updateUserRole(userId: $userId, newRole: $newRole) {
      id
      email
      role # Ensure role is returned to update UI
    }
  }
`;

export const ADMIN_SET_COURSE_PUBLICATION_MUTATION = gql`
  mutation AdminSetCoursePublication($courseId: ID!, $isPublished: Boolean!) {
    adminSetCoursePublication(courseId: $courseId, isPublished: $isPublished) {
      id
      title
      isPublished # Important to update UI
    }
  }
`;

// ClientUserRole enum (matches backend UserRole for clarity if needed in forms)
/*
export enum ClientUserRole {
  STUDENT = "STUDENT",
  INSTRUCTOR = "INSTRUCTOR",
  ADMIN = "ADMIN",
}
*/
