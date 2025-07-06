import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApolloClient } from '@apollo/client';

// Define the shape of the user object and context
interface User {
  id: string;
  email: string;
  role: string; // STUDENT, INSTRUCTOR, ADMIN
  // Add other user fields if necessary, e.g., name, profile picture
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean; // To handle initial auth state loading
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true); // Start with loading true
  const apolloClient = useApolloClient();

  useEffect(() => {
    // Check for token in localStorage on initial load
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (token && storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        // TODO: Optionally, verify token with a lightweight backend query here
        // For now, trust the stored token and user data for session persistence
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }
    setLoading(false); // Finished loading auth state
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    // Reset Apollo Client store to clear previous user's cached data (optional but good practice)
    apolloClient.resetStore();
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
    setIsAuthenticated(false);
    // Reset Apollo Client store on logout
    apolloClient.resetStore();
    // Optionally, redirect to login page or home page
    // window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
