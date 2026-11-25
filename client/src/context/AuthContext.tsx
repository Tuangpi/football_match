import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/react';
import api, { setClerkTokenGetter } from '@/lib/api';
import { posthog } from '@/observability';

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
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, role: string) => Promise<AuthResult>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();

  const [user, setUser] = useState<User | null>(null);
  const [resolvedClerkUserId, setResolvedClerkUserId] = useState<string | null>(null);
  const userRequestId = useRef(0);
  useEffect(() => {
    setClerkTokenGetter(getToken);
    return () => setClerkTokenGetter(null);
  }, [getToken]);
  useEffect(() => {
    if (!clerkLoaded) return;

    if (isSignedIn && clerkUser?.id) {
      posthog.identify(clerkUser.id, user?.role ? { role: user.role } : undefined);
      return;
    }

    posthog.reset();
  }, [clerkLoaded, isSignedIn, clerkUser?.id, user?.role]);
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !clerkUser?.id) return;

    let cancelled = false;
    const requestId = ++userRequestId.current;
    api
      .get('/auth/me')
      .then((res: { data: { user: User } }) => {
        if (!cancelled && requestId === userRequestId.current) setUser(res.data.user);
      })
      .catch(() => {
        if (!cancelled && requestId === userRequestId.current) setUser(null);
      })
      .finally(() => {
        if (!cancelled && requestId === userRequestId.current) setResolvedClerkUserId(clerkUser.id);
      });
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, clerkUser?.id]);

  const loading = !clerkLoaded || (isSignedIn && resolvedClerkUserId !== clerkUser?.id);
  const currentUser = isSignedIn ? user : null;

  const login = async (): Promise<AuthResult> => {
    throw new Error('Use Clerk sign-in');
  };

  const register = async (): Promise<AuthResult> => {
    throw new Error('Use Clerk sign-up');
  };

  const refreshUser = async (): Promise<User | null> => {
    if (!clerkLoaded || !isSignedIn || !clerkUser?.id) return null;

    const requestId = ++userRequestId.current;
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      if (requestId === userRequestId.current) setUser(res.data.user);
      return res.data.user;
    } catch {
      if (requestId === userRequestId.current) setUser(null);
      return null;
    } finally {
      if (requestId === userRequestId.current) setResolvedClerkUserId(clerkUser.id);
    }
  };

  const logout = async () => {
    await clerk.signOut();
    posthog.reset();
    setUser(null);
    navigate('/', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user: currentUser, loading, login, register, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
