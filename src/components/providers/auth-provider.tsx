"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  _id?: string;
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  whatsappNumber?: string;
  lastLogin?: string;
}

interface Company {
  _id: string;
  name: string;
  code: string;
  currency: string;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  permissions: string[];
  loading: boolean;
  login: (email: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(
          data.user
            ? {
                ...data.user,
                id: data.user.id || data.user._id,
              }
            : null
        );
        setCompany(data.company);
        setPermissions(data.permissions || []);
      } else {
        setUser(null);
        setCompany(null);
        setPermissions([]);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, pin: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin }),
      });

      const data = await res.json();
      if (res.ok) {
        await refreshSession();
        router.push("/dashboard");
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setCompany(null);
    setPermissions([]);
    router.push("/login");
  };

  const hasPermission = (permission: string) => {
    if (permissions.includes("*")) return true;
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{ user, company, permissions, loading, login, logout, hasPermission, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
