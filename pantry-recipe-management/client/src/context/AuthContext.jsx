import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await api.auth.getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to load user session', err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async ({ email, password }) => {
    const res = await api.auth.login({ email, password });
    setCurrentUser(res.user);
    return res.user;
  };

  const register = async ({ name, email, password, cooking_level }) => {
    const res = await api.auth.register({ name, email, password, cooking_level });
    setCurrentUser(res.user);
    return res.user;
  };

  const logout = () => {
    api.auth.logout();
    setCurrentUser(null);
  };

  const updateCookingLevel = async (level) => {
    const updated = await api.auth.updatePreferences({ cooking_level: level });
    setCurrentUser(updated);
  };



  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        register,
        logout,
        updateCookingLevel,
        isAuthenticated: Boolean(currentUser)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
