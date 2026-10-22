import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "../services/api";
import { User } from "../types";

export const DEFAULT_DEMO_USER: User = {
  id: "demo-planner-001",
  email: "planner@eventwise.ai",
  full_name: "Event Planner",
  is_active: true,
  created_at: new Date().toISOString(),
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("eventwise_user");
    return saved ? JSON.parse(saved) : DEFAULT_DEMO_USER;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("eventwise_token")
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("eventwise_token", newToken);
    localStorage.setItem("eventwise_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("eventwise_token");
    localStorage.removeItem("eventwise_user");
    // Automatically re-initialize demo user session
    setUser(DEFAULT_DEMO_USER);
    setToken(null);
  };

  const initSession = async () => {
    try {
      const savedToken = localStorage.getItem("eventwise_token");
      if (savedToken) {
        setToken(savedToken);
        const res = await apiClient.get<User>("/auth/me");
        setUser(res.data);
        localStorage.setItem("eventwise_user", JSON.stringify(res.data));
        return;
      }

      // If no token stored, automatically obtain an instant demo planner session
      const res = await apiClient.post<{ access_token: string; user: User }>("/auth/demo");
      if (res.data?.access_token) {
        login(res.data.access_token, res.data.user);
      }
    } catch {
      // In offline mode or local test fallback, maintain default demo session
      setUser(DEFAULT_DEMO_USER);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: user || DEFAULT_DEMO_USER,
        token,
        isAuthenticated: true,
        isLoading,
        login,
        logout,
        refreshUser: initSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

