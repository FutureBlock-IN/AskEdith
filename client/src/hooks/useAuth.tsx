import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  QueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, UpsertUser, ExpertVerification, UserRole } from "@shared/schema";
import { z } from "zod";
import { useUser, useClerk } from "@clerk/clerk-react";

type InsertUser = z.infer<typeof insertUserSchema>;

type RegisterCredentials = InsertUser & { isExpert?: boolean; };
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UserWithVerification = SelectUser & { 
  role: UserRole;
  expertVerification: ExpertVerification | null 
};

type AuthContextType = {
  user: UserWithVerification | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  needsOnboarding: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserWithVerification, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserWithVerification, Error, RegisterCredentials>;
};

type LoginData = Pick<UpsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut } = useClerk();
  
  // Add timeout for Clerk initialization to prevent infinite loading
  const [clerkTimeout, setClerkTimeout] = useState(false);
  
  useEffect(() => {
    // If Clerk doesn't load within 10 seconds, assume it failed and continue
    const timeout = setTimeout(() => {
      if (!clerkLoaded) {
        console.warn('Clerk initialization timeout - continuing without auth');
        setClerkTimeout(true);
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [clerkLoaded]);
  
  // Get user data from our database based on Clerk authentication
  const {
    data: user,
    error,
    isLoading: userQueryLoading,
  } = useQuery<UserWithVerification | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 15 * 60 * 1000, // 15 minutes - user data changes rarely
    enabled: clerkLoaded && !!clerkUser, // Only run query if Clerk user is loaded and authenticated
  });

  // Check profile completeness when user is authenticated
  const {
    data: profileCheck,
    isLoading: profileCheckLoading,
  } = useQuery({
    queryKey: ["/api/profile-complete"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: clerkLoaded && !!clerkUser, // Check whenever Clerk user exists
  });

  // Allow app to continue if Clerk times out
  const isLoading = (!clerkLoaded && !clerkTimeout) || (clerkLoaded && !!clerkUser && (userQueryLoading || profileCheckLoading));
  
  // Determine if user needs onboarding - check for all required fields
  const isProfileComplete = !!(user?.firstName && user?.lastName && user?.email && user?.communityName && user?.city && user?.state && user?.username);
  const needsOnboarding = Boolean(clerkLoaded && !!clerkUser && (
    (!user && (profileCheck as any)?.isComplete === false) || 
    (user && !isProfileComplete)
  ));

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      return await apiRequest("POST", "/api/login", credentials);
    },
    onSuccess: (user: UserWithVerification) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      try {
        const userData = await apiRequest("POST", "/api/register", credentials);
        return userData;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (user: UserWithVerification) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Account created successfully!",
        description: `Welcome to AskEdith, ${user.firstName || user.username}!`,
      });
      // If professional user, redirect to expert application
      if (user.defaultProfileType === 'tree') {
        setTimeout(() => {
          window.location.href = '/expert-application-with-payment';
        }, 1500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message.includes('API routing error') 
          ? "Connection issue - please try again" 
          : error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Use Clerk's signOut instead of custom logout
      await signOut();
      queryClient.setQueryData(["/api/user"], null);
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!(clerkUser && user),
        isProfileComplete,
        needsOnboarding,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}