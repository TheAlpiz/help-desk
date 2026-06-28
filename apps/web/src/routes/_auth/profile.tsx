import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Camera, Save, Moon, Sun, Monitor } from "lucide-react";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";
import { Button, Input } from "@/components/ui";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { type SupportedLanguage } from "@/i18n";

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

type ThemeMode = "system" | "light" | "dark";

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
  const { t } = useTranslation("profile");
  const userId = useAppStore((s) => s.user?.id);
  const saved = loadPrefs();
  const [theme, setTheme] = useState<ThemeMode>(saved.theme ?? "system");
  const [locale, setLocale] = useState<string>(saved.locale ?? "en-US");
  const [timezone, setTimezone] = useState<string>(
    saved.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [saved2, setSaved2] = useState(false);
  const { success } = useToast();

  const THEME_OPTIONS: {
    value: ThemeMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "system",
      label: t("theme.system"),
      icon: <Monitor className="w-3.5 h-3.5" />,
    },
    {
      value: "light",
      label: t("theme.light"),
      icon: <Sun className="w-3.5 h-3.5" />,
    },
    {
      value: "dark",
      label: t("theme.dark"),
      icon: <Moon className="w-3.5 h-3.5" />,
    },
  ];

  const apply = () => {
    savePrefs({ theme, locale, timezone });
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    setSaved2(true);
    setTimeout(() => setSaved2(false), 2000);
    success(t("preferencesSaved"));
  };

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    if (!userId) return;
    try {
      await api.users[":id"].$put({
        param: { id: userId },
        json: { preferredLanguage: lang } as any,
      });
      success(t("languageSaved"));
    } catch {
      // Language is already changed in the UI via LanguageSwitcher internally;
      // backend persistence failure is non-blocking.
    }
  };

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-5">
      <h3 className="text-sm font-semibold text-on-surface">
        {t("sections.preferences")}
      </h3>

      <div className="space-y-2">
        <label className="text-xs font-medium text-on-surface">
          {t("sections.theme")}
        </label>
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
        <label className="text-xs font-medium text-on-surface">
          {t("fields.preferredLanguage")}
        </label>
        <LanguageSwitcher
          variant="inline"
          onLanguageChange={handleLanguageChange}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-on-surface">
          {t("sections.timezone")}
        </label>
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
          {saved2 ? t("savedPreferences") : t("savePreferences")}
        </Button>
      </div>
    </div>
  );
}

function Profile() {
  const { t } = useTranslation("profile");
  const { user, setUser } = useAppStore();
  const { success, error: toastError } = useToast();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email] = useState(user?.email ?? "");
  const [githubLogin, setGithubLogin] = useState<string>((user as any)?.githubLogin ?? "");

  const githubMutation = useMutation({
    mutationFn: async () => {
      const res = await api.users.me["github-login"].$put({
        json: { githubLogin: githubLogin || null },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      success(t("githubSaved", "GitHub username saved"));
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toastError(t("profileUpdateFailed")),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.users[":id"].$put({
        param: { id: user!.id },
        json: { firstName, lastName } as any,
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
      success(t("profileUpdated"));
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toastError(t("profileUpdateFailed")),
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
            {t("title")}
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-on-surface">
            {t("sections.personalInfo")}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">
                {t("fields.firstName")}
              </label>
              <Input
                dense
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("fields.firstName")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">
                {t("fields.lastName")}
              </label>
              <Input
                dense
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("fields.lastName")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">
              {t("fields.email")}
            </label>
            <Input
              dense
              value={email}
              readOnly
              className="opacity-60 cursor-not-allowed"
            />
            <p className="text-[10px] text-on-surface-variant/40">
              {t("emailHint")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">
              {t("fields.role")}
            </label>
            <Input
              dense
              value={user?.globalRole?.toLowerCase().replace("_", " ") ?? ""}
              readOnly
              className="opacity-60 cursor-not-allowed capitalize"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">
              {t("fields.githubLogin", "GitHub username")}
            </label>
            <div className="flex gap-2">
              <Input
                dense
                value={githubLogin}
                onChange={(e) => setGithubLogin(e.target.value)}
                placeholder="octocat"
              />
              <Button
                variant="secondary"
                onClick={() => githubMutation.mutate()}
                disabled={githubMutation.isPending}
                loading={githubMutation.isPending}
              >
                <Save className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-on-surface-variant/40">
              {t("githubHint", "Used to match you to repo collaborators for task assignment.")}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              loading={updateMutation.isPending}
            >
              <Save className="w-3.5 h-3.5" />
              {t("saveChanges")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <PreferencesSection />

          <div className="bg-surface-container border border-outline-variant rounded-xl divide-y divide-outline-variant overflow-hidden">
            {[
              { label: t("links.changePassword"), href: "/account-security" },
              {
                label: t("links.notificationPreferences"),
                href: "/notification-preferences",
              },
              { label: t("links.apiTokens"), href: "/api-tokens" },
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
