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
  availability?: string;
};

// Live presence for org members, keyed by userId. Online = has a WS socket.
export type PresenceEntry = { online: boolean; availability?: string };

type AppState = {
  user: UserContext | null;
  tenantId: string | null;
  sidebarOpen: boolean;
  accessToken?: string;
  theme: "light" | "dark" | "system";
  language: SupportedLanguage;
  notificationSound: boolean;
  presence: Record<string, PresenceEntry>;

  // Actions
  setUser: (user: UserContext | null) => void;
  setTenantId: (tenantId: string | null) => void;
  setAccessToken: (token: string | undefined) => void;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleNotificationSound: () => void;
  // Presence
  seedPresence: (online: string[], availability: Record<string, string>) => void;
  applyPresence: (userId: string, patch: PresenceEntry) => void;
  setMyAvailability: (availability: string) => void;
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
      language: "tr",
      notificationSound: true,
      presence: {},

      setUser: (user) => set({ user }),
      setTenantId: (tenantId) => set({ tenantId }),
      setAccessToken: (accessToken) => set({ accessToken }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleNotificationSound: () => set((state) => ({ notificationSound: !state.notificationSound })),
      seedPresence: (online, availability) =>
        set(() => {
          const onlineSet = new Set(online);
          const presence: Record<string, PresenceEntry> = {};
          for (const [userId, av] of Object.entries(availability)) {
            presence[userId] = { online: onlineSet.has(userId), availability: av };
          }
          // Cover online users that have no availability row yet.
          for (const userId of online) {
            if (!presence[userId]) presence[userId] = { online: true };
          }
          return { presence };
        }),
      applyPresence: (userId, patch) =>
        set((state) => ({
          presence: {
            ...state.presence,
            [userId]: { ...state.presence[userId], ...patch },
          },
        })),
      setMyAvailability: (availability) =>
        set((state) => ({
          user: state.user ? { ...state.user, availability } : state.user,
          presence: state.user
            ? { ...state.presence, [state.user.id]: { ...state.presence[state.user.id], online: true, availability } }
            : state.presence,
        })),
      logout: () => set({ user: null, tenantId: null, accessToken: undefined, presence: {} }),
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
      // v4 migration: default language changed to tr
      version: 4,
      migrate: (persisted: any, version: number) => ({
        theme: persisted?.theme ?? "system",
        sidebarOpen: persisted?.sidebarOpen ?? true,
        language: (version < 4 ? "tr" : persisted?.language) ?? "tr",
        notificationSound: persisted?.notificationSound ?? true,
      }),
    },
  ),
);
