import { createFileRoute, Link } from "@tanstack/react-router";
import { authFetch } from "@/lib/api";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Camera, Save, Moon, Sun, Monitor } from "lucide-react";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";
import { Button, Input } from "@/components/ui";

export const Route = createFileRoute("/_auth/profile")({
  component: Profile,
});

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const LOCALES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "tr-TR", label: "Türkçe" },
  { value: "de-DE", label: "Deutsch" },
  { value: "fr-FR", label: "Français" },
  { value: "es-ES", label: "Español" },
  { value: "pt-BR", label: "Português (BR)" },
  { value: "ar-SA", label: "العربية" },
];

type ThemeMode = "system" | "light" | "dark";

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "system",
    label: "System",
    icon: <Monitor className="w-3.5 h-3.5" />,
  },
  { value: "light", label: "Light", icon: <Sun className="w-3.5 h-3.5" /> },
  { value: "dark", label: "Dark", icon: <Moon className="w-3.5 h-3.5" /> },
];

const PREF_KEY = "helpdesk-prefs";

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function savePrefs(p: object) {
  localStorage.setItem(PREF_KEY, JSON.stringify(p));
}

const selectCls =
  "w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";

function PreferencesSection() {
  const saved = loadPrefs();
  const [theme, setTheme] = useState<ThemeMode>(saved.theme ?? "system");
  const [locale, setLocale] = useState<string>(saved.locale ?? "en-US");
  const [timezone, setTimezone] = useState<string>(
    saved.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [saved2, setSaved2] = useState(false);
  const { success } = useToast();

  const apply = () => {
    savePrefs({ theme, locale, timezone });
    document.documentElement.setAttribute("data-theme", theme);
    setSaved2(true);
    setTimeout(() => setSaved2(false), 2000);
    success("Preferences saved");
  };

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-5">
      <h3 className="text-sm font-semibold text-on-surface">Preferences</h3>

      <div className="space-y-2">
        <label className="text-xs font-medium text-on-surface">Theme</label>
        <div className="flex items-center gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                theme === opt.value
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-primary/25"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-on-surface">Language</label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className={selectCls}
        >
          {LOCALES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-on-surface">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={selectCls}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end">
        <Button onClick={apply}>
          <Save className="w-3.5 h-3.5" />
          {saved2 ? "Saved!" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}

function Profile() {
  const { user, setUser } = useAppStore();
  const { success, error: toastError } = useToast();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email] = useState(user?.email ?? "");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const state = useAppStore.getState();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (state.accessToken)
        headers["Authorization"] = `Bearer ${state.accessToken}`;
      if (state.tenantId) headers["X-Tenant-ID"] = state.tenantId;
      const res = await authFetch(`/api/users/${user!.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ firstName, lastName }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: (data: any) => {
      const updated = data?.data;
      if (updated)
        setUser({
          ...user!,
          firstName: updated.firstName,
          lastName: updated.lastName,
        });
      success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toastError("Failed to save changes"),
  });

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-xl font-bold text-primary">
            {initials || <User className="w-7 h-7" />}
          </div>
          <button
            title="Change avatar (coming soon)"
            disabled
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface-variant/50 cursor-not-allowed"
          >
            <Camera className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1">
          <h1 className="text-[15px] font-semibold text-on-surface">
            My Profile
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage your personal information.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-on-surface">
            Personal information
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">
                First name
              </label>
              <Input
                dense
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">
                Last name
              </label>
              <Input
                dense
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">
              Email address
            </label>
            <Input
              dense
              value={email}
              readOnly
              className="opacity-60 cursor-not-allowed"
            />
            <p className="text-[10px] text-on-surface-variant/40">
              Email changes require verification — contact your admin.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Role</label>
            <Input
              dense
              value={user?.globalRole?.toLowerCase().replace("_", " ") ?? ""}
              readOnly
              className="opacity-60 cursor-not-allowed capitalize"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              loading={updateMutation.isPending}
            >
              <Save className="w-3.5 h-3.5" />
              Save changes
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <PreferencesSection />

          <div className="bg-surface-container border border-outline-variant rounded-xl divide-y divide-outline-variant overflow-hidden">
            {[
              { label: "Change password", href: "/account-security" },
              {
                label: "Notification preferences",
                href: "/notification-preferences",
              },
              { label: "API tokens", href: "/api-tokens" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                to={href}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors text-sm text-on-surface-variant hover:text-on-surface"
              >
                {label}
                <span className="text-on-surface-variant/30">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
