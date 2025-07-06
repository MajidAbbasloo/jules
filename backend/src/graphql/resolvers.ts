import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RegisterInput, LoginInput }
from './types'; // Assuming types.ts for input validation, will create later if complex

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

interface Context {
  prisma: PrismaClient;
  user?: { id: string; role: UserRole }; // Optional user, present if authenticated
}

export const resolvers = {
  Query: {
    hello: () => "Hello from Apollo Server!",
    me: async (_parent: any, _args: any, context: Context) => {
      if (!context.user) {
        return null; // Or throw an AuthenticationError
      }
      return context.prisma.user.findUnique({
        where: { id: context.user.id },
        include: { profile: true },
      });
    },
  },

  Mutation: {
    register: async (_parent: any, { input }: { input: RegisterInput }, context: Context) => {
      const { email, password, firstName, lastName, role } = input;

      // 1. Validate input (basic example, can be more complex with a library like Joi or Zod)
      if (!email || !password) {
        throw new Error('Email and password are required.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      // 2. Check if user already exists
      const existingUser = await context.prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('User with this email already exists.');
      }

      // 3. Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 4. Create user and profile (if details provided)
      const userRole = role || UserRole.STUDENT; // Default role

      const user = await context.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: userRole,
          profile: (firstName || lastName) ? {
            create: {
              firstName,
              lastName,
            },
          } : undefined,
        },
        include: { profile: true },
      });

      // 5. Generate JWT token
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      // 6. Return token and user
      return {
        token,
        user,
      };
    },

    login: async (_parent: any, { input }: { input: LoginInput }, context: Context) => {
      const { email, password } = input;

      // 1. Find user by email
      const user = await context.prisma.user.findUnique({
        where: { email },
        include: { profile: true }
      });
      if (!user) {
        throw new Error('Invalid credentials. User not found.');
      }

      // 2. Compare password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials. Password incorrect.');
      }

      // TODO: Check for email verification if required for login
      // if (!user.isEmailVerified) {
      //   throw new Error('Please verify your email before logging in.');
      // }

      // 3. Generate JWT token
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      // 4. Return token and user
      return {
        token,
        user,
      };
    },
  },

  // Resolver for User.profile if needed separately, though Prisma handles it with `include`
  User: {
    profile: async (parent: { id: string }, _args: any, context: Context) => {
      // If profile wasn't included in the parent query, fetch it here
      // This is often handled by Prisma's `include` option in the parent resolver.
      // However, it can be useful if you want to fetch it conditionally or separately.
      return context.prisma.profile.findUnique({
        where: { userId: parent.id },
      });
    },
    // Ensure createdAt is returned as a string (ISO date)
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
  },

  Profile: {
    // If you need specific resolvers for Profile fields, add them here
  }
};

// It's good practice to define input types for resolvers if they become complex
// or if you want to use them with validation libraries.
// For now, RegisterInput and LoginInput are simple enough to be inline,
// but for larger applications, you might put them in a separate types.ts file.

// Example for backend/src/graphql/types.ts (if you create it)
/*
export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}
*/
