import React, { createContext, useState, useContext, useEffect } from 'react';
import { getAdminSession, clearAdminSession } from '@/lib/adminSession';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = () => {
    try {
      const session = getAdminSession();
      if (session) {
        setUser(session);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError({ type: 'unknown', message: error.message });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    clearAdminSession();
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    window.location.href = '/admin-login?key=sdnexus2026';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};