import { create } from "zustand";
import type { User, LoginInput, RegisterInput } from "../types/auth";
import {
  loginApi,
  registerApi,
  refreshApi,
  logoutApi,
} from "../services/authApi";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (input: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await loginApi(input);
      set({
        user: response.data.user,
        token: response.data.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to log in",
        isLoading: false,
      });
      throw err;
    }
  },

  register: async (input: RegisterInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await registerApi(input);
      set({
        user: response.data.user,
        token: response.data.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Registration failed",
        isLoading: false,
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await logoutApi();
    } catch {
      // Ignore network errors on logout
    } finally {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  initializeAuth: async () => {
    set({ isInitializing: true });
    try {
      const response = await refreshApi();
      set({
        user: response.data.user,
        token: response.data.accessToken,
        isAuthenticated: true,
        isInitializing: false,
      });
    } catch {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  },
}));
