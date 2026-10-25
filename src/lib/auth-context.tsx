import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMe,
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
  type AuthUser,
} from "@/lib/auth-client";

const ME_QUERY_KEY = ["me"];

type AuthContextValue = {
  user: AuthUser | null;
  // True only until the first /api/auth/me check resolves — route guards
  // wait on this instead of briefly redirecting a signed-in-but-unchecked
  // visitor to /login.
  isLoading: boolean;
  signIn: (input: { email: string; password: string }) => Promise<AuthUser>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    website?: string;
  }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  // Settings writes the updated user straight into the cache the same way
  // signIn/signUp do — no refetch needed, the PATCH response already has it.
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const meQuery = useQuery({ queryKey: ME_QUERY_KEY, queryFn: getMe, staleTime: 60_000 });

  const value: AuthContextValue = {
    user: meQuery.data ?? null,
    isLoading: meQuery.isPending,
    signIn: async (input) => {
      const user = await apiSignIn(input);
      queryClient.setQueryData(ME_QUERY_KEY, user);
      return user;
    },
    signUp: async (input) => {
      const user = await apiSignUp(input);
      queryClient.setQueryData(ME_QUERY_KEY, user);
      return user;
    },
    signOut: async () => {
      await apiSignOut();
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
    setUser: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
