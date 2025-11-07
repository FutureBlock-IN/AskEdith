import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './typeDefs';
import { resolvers } from './resolvers';
import { Server } from 'http';
import type { Express } from 'express';

// Create GraphQL schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export async function createGraphQLServer(app: Express, httpServer: Server) {
  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        code: error.extensions?.code,
        path: error.path,
      };
    },
  });

  // Start the server
  await server.start();

  // Apply the Apollo GraphQL middleware
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Extract user from session for authentication
        const user = (req as any).user || null;
        
        return {
          user,
          req,
        };
      },
    })
  );

  console.log('🚀 GraphQL server ready at http://localhost:5000/graphql');
  
  return server;
}