import React, { createContext, useContext, useEffect, useState } from "react";
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
      const savedUser = localStorage.getItem("eventwise_user");
      const savedToken = localStorage.getItem("eventwise_token");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(DEFAULT_DEMO_USER);
        }
        setToken(savedToken || "demo-local-token-001");
      } else {
        localStorage.setItem("eventwise_user", JSON.stringify(DEFAULT_DEMO_USER));
        localStorage.setItem("eventwise_token", "demo-local-token-001");
        setUser(DEFAULT_DEMO_USER);
        setToken("demo-local-token-001");
      }
    } catch {
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

