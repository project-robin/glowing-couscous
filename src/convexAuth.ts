import { useState, useEffect } from 'react';

/**
 * Custom useAuth function for ConvexProviderWithAuth
 * This provides the authentication state that Convex requires
 */
export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated via localStorage or other means
    // For now, we'll use a simple check - in production, this should integrate
    // with your actual authentication system (Clerk, Auth0, etc.)
    const checkAuth = () => {
      try {
        // Check for authentication token in localStorage
        const token = localStorage.getItem('convexAuthToken');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchAccessToken = async (_params: { forceRefreshToken: boolean }) => {
    // Return the authentication token
    // In production, this should fetch a fresh token from your auth provider
    const token = localStorage.getItem('convexAuthToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  };

  return {
    isLoading,
    isAuthenticated,
    fetchAccessToken,
  };
};
