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
