import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';

type User = {
  id: string;
  email: string;
  role: string;
  playerProfile?: { fullName?: string | null; avatarUrl?: string | null } | null;
};

type AuthResult = { success: boolean; user: User; message?: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  hasLoggedOut: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, role: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res: any) => {
        setUser(res.data.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const res = await api.post('/auth/login', { email, password });
    setHasLoggedOut(false);
    setUser(res.data.user);
    return { success: true, user: res.data.user };
  };

  const register = async (email: string, password: string, role: string): Promise<AuthResult> => {
    const res = await api.post('/auth/register', { email, password, role });
    setHasLoggedOut(false);
    setUser(res.data.user);
    return { success: true, user: res.data.user };
  };

  const logout = async () => {
    await api.post('/auth/logout');
    // Outgoing protected pages may still render during their exit transition.
    setHasLoggedOut(true);
    navigate('/', { replace: true });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, hasLoggedOut, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};