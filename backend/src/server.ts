import express, { Request } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { PrismaClient, UserRole } from '@prisma/client';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { typeDefs } from './graphql/typeDefs.js'; // .js due to ES Module resolution
import { resolvers } from './graphql/resolvers.js'; // .js due to ES Module resolution

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';

interface DecodedToken {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

interface ContextUser {
  id: string;
  role: UserRole;
}

// Function to get user from JWT
const getUserFromToken = (token: string): ContextUser | null => {
  if (!token) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return { id: decoded.userId, role: decoded.role };
  } catch (error) {
    console.warn('Invalid or expired token:', error.message);
    return null;
  }
};

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }: { req: Request }) => {
      const token = req.headers.authorization?.split('Bearer ')[1] || '';
      const user = getUserFromToken(token);
      return {
        prisma,
        user, // Add user to context
      };
    },
    introspection: process.env.NODE_ENV !== 'production', // Enable introspection for dev
    // playground: process.env.NODE_ENV !== 'production', // For older Apollo versions
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(\`🚀 Backend server ready at http://localhost:\${PORT}\${server.graphqlPath}\`);
  });
}

startServer().catch(error => {
  console.error('Error starting server:', error);
  prisma.$disconnect()
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});
