import { createContext, useContext, ReactNode } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type User = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  gender: string | null;
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

  // Redirect to login if not logged in and not on an auth page
  if (isError && !isAuthPage) {
    setLocation("/login");
  }

  // Redirect to dashboard if logged in and on an auth page
  if (user && isAuthPage) {
    setLocation("/dashboard");
  }

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
