import { gql } from 'apollo-server-express';

export const typeDefs = gql`
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
    createdAt: String!
  }

  type Profile {
    id: ID!
    firstName: String
    lastName: String
    bio: String
    avatarUrl: String
  }

  # Input type for user registration
  input RegisterInput {
    email: String!
    password: String!
    firstName: String
    lastName: String
    role: UserRole # Optional, defaults to STUDENT if not provided by admin/specific logic
  }

  # Input type for user login
  input LoginInput {
    email: String!
    password: String!
  }

  # Response type for authentication operations
  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    hello: String # Placeholder, will be removed or moved
    me: User # Get the currently authenticated user
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    # TODO: Add mutations for email verification, password reset, etc.
    # verifyEmail(token: String!): User
    # requestPasswordReset(email: String!): Boolean
    # resetPassword(token: String!, newPassword: String!): AuthPayload
  }
`;
