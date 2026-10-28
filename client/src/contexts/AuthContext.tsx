import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import type { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, expectedRole?: 'student' | 'admin') => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    department?: string
  ) => Promise<{
    message: string;
    email: string;
    verificationType: string;
    deliveryMode?: 'smtp' | 'development';
    devNotice?: string;
  }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): { id: string; role: string; exp: number } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nyayasetu_token');
    const storedUser = localStorage.getItem('nyayasetu_user');

    if (token && storedUser && !isTokenExpired(token)) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('nyayasetu_token');
        localStorage.removeItem('nyayasetu_user');
      }
    } else {
      localStorage.removeItem('nyayasetu_token');
      localStorage.removeItem('nyayasetu_user');
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, expectedRole?: 'student' | 'admin') => {
    const payload: { email: string; password: string; expectedRole?: string } = { email, password };
    if (expectedRole) {
      payload.expectedRole = expectedRole;
    }
    const response = await api.post<AuthResponse>('/auth/login', payload);
    const { token, user: userData } = response.data;
    localStorage.setItem('nyayasetu_token', token);
    localStorage.setItem('nyayasetu_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, department?: string) => {
    const response = await api.post<{
      message: string;
      email: string;
      verificationType: string;
      deliveryMode?: 'smtp' | 'development';
      devNotice?: string;
    }>('/auth/register', {
      name,
      email,
      password,
      department,
    });
    return response.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nyayasetu_token');
    localStorage.removeItem('nyayasetu_user');
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
