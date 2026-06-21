import { create } from "zustand";
import { persist } from "zustand/middleware";

type UserContext = {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string;
};

type AppState = {
  user: UserContext | null;
  tenantId: string | null;
  sidebarOpen: boolean;
  accessToken?: string;
  theme: "light" | "dark" | "system";

  // Actions
  setUser: (user: UserContext | null) => void;
  setTenantId: (tenantId: string | null) => void;
  setAccessToken: (token: string | undefined) => void;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
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

      setUser: (user) => set({ user }),
      setTenantId: (tenantId) => set({ tenantId }),
      setAccessToken: (accessToken) => set({ accessToken }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      logout: () => set({ user: null, tenantId: null, accessToken: undefined }),
    }),
    {
      name: "helpdesk-storage", // unique name for localStorage
    },
  ),
);
