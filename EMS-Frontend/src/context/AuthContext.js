'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('ems_token');
    const savedUser = localStorage.getItem('ems_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try { setUser(JSON.parse(savedUser)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authAPI.login(credentials);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('ems_token', newToken);
    localStorage.setItem('ems_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      const updatedUser = res.data.user;
      setUser(updatedUser);
      localStorage.setItem('ems_user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch { return null; }
  }, []);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  }, [user]);

  const isSuperAdmin = useCallback(() => hasRole('superadmin'), [hasRole]);
  const isAdmin = useCallback(() => hasRole(['superadmin', 'admin', 'hr']), [hasRole]);
  const isHR = useCallback(() => hasRole('hr'), [hasRole]);
  const isManager = useCallback(() => hasRole(['superadmin', 'admin', 'manager']), [hasRole]);
  const isAccountant = useCallback(() => hasRole(['superadmin', 'admin', 'accountant']), [hasRole]);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout, refreshUser,
      hasRole, isSuperAdmin, isAdmin, isHR, isManager, isAccountant,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
