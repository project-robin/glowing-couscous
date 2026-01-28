import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_ASTRO_API_URL;

export const useAstroAuth = () => {
  const [status, setStatus] = useState<'loading' | 'onboarding' | 'ready'>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for authentication token in localStorage
        const authToken = localStorage.getItem('convexAuthToken');
        
        if (!authToken) {
          setIsAuthenticated(false);
          setIsLoading(false);
          setStatus('loading');
          setToken(null);
          return;
        }

        setIsAuthenticated(true);
        setToken(authToken);

        // Check user status with the API
        const res = await fetch(`${API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (res.status === 404) {
          setStatus('onboarding');
        } else if (res.ok) {
          setStatus('ready');
        } else if (res.status === 401) {
          setError('Authentication failed. Please sign in again.');
          setStatus('loading');
        } else if (res.status === 500) {
          setError('Server error. Please try again later.');
          setStatus('loading');
        } else {
          setError('An unexpected error occurred.');
          setStatus('loading');
        }
      } catch (err) {
        setError('Failed to check user status. Please check your connection.');
        setStatus('loading');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { status, isLoading, isAuthenticated, token, error };
};