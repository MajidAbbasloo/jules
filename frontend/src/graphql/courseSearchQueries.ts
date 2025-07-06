import { gql } from '@apollo/client';

// New query for advanced search and filtering on public course listings
export const GET_ALL_COURSES_WITH_FILTERS = gql`
  query GetAllCoursesWithFilters(
    $publishedOnly: Boolean
    $searchQuery: String
    $categoryIds: [ID!]
    $levels: [CourseLevel!] # Ensure CourseLevel enum is defined in client-side types or handled as string
    $priceMin: Float
    $priceMax: Float
    $languages: [String!]
    $sortBy: CourseSortBy # Ensure CourseSortBy enum is defined in client-side types or handled as string
  ) {
    getAllCourses( # This calls the enhanced backend query
      publishedOnly: $publishedOnly
      searchQuery: $searchQuery
      categoryIds: $categoryIds
      levels: $levels
      priceMin: $priceMin
      priceMax: $priceMax
      languages: $languages
      sortBy: $sortBy
    ) {
      id
      title
      description
      thumbnailUrl
      price
      level
      language
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
      # reviews { # Only if needed for client-side rating display and not available directly
      #   rating
      # }
      _count {
        enrollments
      }
      averageRating # Fetched directly from backend resolver
    }
  }
`;

// We also need client-side enum definitions if we are to use them strictly in TypeScript.
// These should mirror the backend GraphQL enums.
// For now, components will likely pass string values that match enum keys.
/*
export enum ClientCourseLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
  ALL_LEVELS = "ALL_LEVELS",
}

export enum ClientCourseSortBy {
  NEWEST = "NEWEST",
  POPULARITY = "POPULARITY",
  HIGHEST_RATED = "HIGHEST_RATED",
}
*/
