import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import type { AuthState, User } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_BASE}/api/login`, {
            username,
            password,
          });

          if (response.data.success) {
            const userData: User = response.data.user;
            set({ user: userData, isLoading: false });
          } else {
            set({
              error: response.data.error || "Login failed",
              isLoading: false,
            });
          }
        } catch (err: any) {
          const errorMessage = err.response?.data?.error || "Failed to login";
          set({ error: errorMessage, isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, error: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

export const canViewFinancials = (role: string): boolean => {
  return role === "admin" || role === "admin_readonly";
};

export const canEdit = (role: string): boolean => {
  return role === "admin";
};

export const canDelete = (role: string): boolean => {
  return role === "admin";
};

export const canAdd = (role: string): boolean => {
  return role !== "staff" || role === "staff";
};
