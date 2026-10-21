import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('scm_user');
    return saved ? JSON.parse(saved) : {
      username: 'admin',
      fullName: 'Lead SCM Architect',
      email: 'admin@scmtimemachine.org',
      role: 'Lead SCM Architect'
    };
  });

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    setUser(res.user);
    localStorage.setItem('scm_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('scm_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: Boolean(user) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
