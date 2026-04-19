import { createContext, useContext, useEffect, ReactNode } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type User = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const isAuthPage = location === "/login" || location === "/register";

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      retry: false,
    },
  });

  useEffect(() => {
    if (isError && !isAuthPage) {
      setLocation("/login");
    }
  }, [isError, isAuthPage]);

  useEffect(() => {
    if (user && isAuthPage) {
      setLocation("/dashboard");
    }
  }, [user, isAuthPage]);

  return (
    <AuthContext.Provider value={{ user: (user as User) ?? null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
