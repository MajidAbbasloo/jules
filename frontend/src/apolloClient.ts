import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql', // Ensure this is configurable
});

const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = localStorage.getItem('authToken');
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

// Middleware for logging GraphQL operations (optional, good for debugging)
const logLink = new ApolloLink((operation, forward) => {
  console.log(
    `GraphQL Request: ${operation.operationName}`,
    operation.variables
  );
  return forward(operation).map((response) => {
    console.log(
      `GraphQL Response: ${operation.operationName}`,
      response.data
    );
    return response;
  });
});


const client = new ApolloClient({
  link: authLink.concat(logLink).concat(httpLink), // Chain the auth link and http link
  cache: new InMemoryCache(),
});

export default client;
