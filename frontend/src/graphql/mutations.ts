import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      token
      user {
        id
        email
        role
        isEmailVerified
        profile {
          firstName
          lastName
        }
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
        isEmailVerified
        profile {
          firstName
          lastName
        }
      }
    }
  }
`;

// Enum UserRole needs to be available to the client if used directly in variables,
// but it's defined on the server. For client-side forms, you'd typically use strings
// that match the enum values, e.g., "STUDENT", "INSTRUCTOR".
// The UserRole enum is defined in the backend's GraphQL schema.
// If you need to reference it explicitly in client-side TypeScript for type safety
// (e.g. for a dropdown), you might define a similar enum/type on the client.
/*
export enum ClientUserRole {
  STUDENT = "STUDENT",
  INSTRUCTOR = "INSTRUCTOR",
  ADMIN = "ADMIN",
}
*/
