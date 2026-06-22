import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SupportedLanguage } from "@/i18n";

type UserContext = {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string;
  preferredLanguage?: string | null;
  forcePasswordChange?: boolean;
  emailVerified?: boolean;
};

type AppState = {
  user: UserContext | null;
  tenantId: string | null;
  sidebarOpen: boolean;
  accessToken?: string;
  theme: "light" | "dark" | "system";
  language: SupportedLanguage;
  notificationSound: boolean;

  // Actions
  setUser: (user: UserContext | null) => void;
  setTenantId: (tenantId: string | null) => void;
  setAccessToken: (token: string | undefined) => void;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleNotificationSound: () => void;
  logout: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      tenantId: null,
      accessToken: undefined,
      sidebarOpen: true,
      theme: "system",
      language: "en",
      notificationSound: true,

      setUser: (user) => set({ user }),
      setTenantId: (tenantId) => set({ tenantId }),
      setAccessToken: (accessToken) => set({ accessToken }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleNotificationSound: () => set((state) => ({ notificationSound: !state.notificationSound })),
      logout: () => set({ user: null, tenantId: null, accessToken: undefined }),
    }),
    {
      name: "helpdesk-storage",
      // SECURITY: only UI preferences are persisted. The access token lives in
      // memory only (XSS cannot read it from storage), and user/tenant identity is
      // re-hydrated from the server (GET /auths/me) after a silent refresh on boot.
      partialize: (state) => ({ 
        theme: state.theme, 
        sidebarOpen: state.sidebarOpen, 
        language: state.language,
        notificationSound: state.notificationSound 
      }),
      // v3 migration: add notificationSound field with default true
      version: 3,
      migrate: (persisted: any, version: number) => ({
        theme: persisted?.theme ?? "system",
        sidebarOpen: persisted?.sidebarOpen ?? true,
        language: (version < 2 ? "en" : persisted?.language) ?? "en",
        notificationSound: persisted?.notificationSound ?? true,
      }),
    },
  ),
);
