import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// ── EN namespaces ─────────────────────────────────────────────────────────────
import enCommon from "./locales/en/common.json";
import enNav from "./locales/en/nav.json";
import enAuth from "./locales/en/auth.json";
import enTickets from "./locales/en/tickets.json";
import enTasks from "./locales/en/tasks.json";
import enUsers from "./locales/en/users.json";
import enSettings from "./locales/en/settings.json";
import enSla from "./locales/en/sla.json";
import enReports from "./locales/en/reports.json";
import enNotifications from "./locales/en/notifications.json";
import enDashboard from "./locales/en/dashboard.json";
import enMailboxes from "./locales/en/mailboxes.json";
import enAutomations from "./locales/en/automations.json";
import enProfile from "./locales/en/profile.json";
import enCompliance from "./locales/en/compliance.json";
import enExport from "./locales/en/export.json";
import enAuditLogs from "./locales/en/audit-logs.json";
import enTenants from "./locales/en/tenants.json";
import enSuperAdmin from "./locales/en/superAdmin.json";
import enBilling from "./locales/en/billing.json";
import enMarketing from "./locales/en/marketing.json";
import enWhatsapp from "./locales/en/whatsapp.json";
import enApiTokens from "./locales/en/apiTokens.json";
import enOnboarding from "./locales/en/onboarding.json";
import enMessages from "./locales/en/messages.json";

// ── TR namespaces ─────────────────────────────────────────────────────────────
import trCommon from "./locales/tr/common.json";
import trNav from "./locales/tr/nav.json";
import trAuth from "./locales/tr/auth.json";
import trTickets from "./locales/tr/tickets.json";
import trTasks from "./locales/tr/tasks.json";
import trUsers from "./locales/tr/users.json";
import trSettings from "./locales/tr/settings.json";
import trSla from "./locales/tr/sla.json";
import trReports from "./locales/tr/reports.json";
import trNotifications from "./locales/tr/notifications.json";
import trDashboard from "./locales/tr/dashboard.json";
import trMailboxes from "./locales/tr/mailboxes.json";
import trAutomations from "./locales/tr/automations.json";
import trProfile from "./locales/tr/profile.json";
import trCompliance from "./locales/tr/compliance.json";
import trExport from "./locales/tr/export.json";
import trAuditLogs from "./locales/tr/audit-logs.json";
import trTenants from "./locales/tr/tenants.json";
import trSuperAdmin from "./locales/tr/superAdmin.json";
import trBilling from "./locales/tr/billing.json";
import trMarketing from "./locales/tr/marketing.json";
import trWhatsapp from "./locales/tr/whatsapp.json";
import trApiTokens from "./locales/tr/apiTokens.json";
import trOnboarding from "./locales/tr/onboarding.json";
import trMessages from "./locales/tr/messages.json";

export const SUPPORTED_LANGUAGES = ["tr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  tr: "Türkçe",
  en: "English",
};

export const DEFAULT_LANGUAGE: SupportedLanguage = "tr";

export const NAMESPACES = [
  "common",
  "nav",
  "auth",
  "tickets",
  "tasks",
  "users",
  "settings",
  "sla",
  "reports",
  "notifications",
  "dashboard",
  "mailboxes",
  "automations",
  "profile",
  "compliance",
  "export",
  "audit-logs",
  "tenants",
  "superAdmin",
  "billing",
  "marketing",
  "whatsapp",
  "apiTokens",
  "onboarding",
  "messages",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        nav: enNav,
        auth: enAuth,
        tickets: enTickets,
        tasks: enTasks,
        users: enUsers,
        settings: enSettings,
        sla: enSla,
        reports: enReports,
        notifications: enNotifications,
        dashboard: enDashboard,
        mailboxes: enMailboxes,
        automations: enAutomations,
        profile: enProfile,
        compliance: enCompliance,
        export: enExport,
        "audit-logs": enAuditLogs,
        tenants: enTenants,
        superAdmin: enSuperAdmin,
        billing: enBilling,
        marketing: enMarketing,
        whatsapp: enWhatsapp,
        apiTokens: enApiTokens,
        onboarding: enOnboarding,
        messages: enMessages,
      },
      tr: {
        common: trCommon,
        nav: trNav,
        auth: trAuth,
        tickets: trTickets,
        tasks: trTasks,
        users: trUsers,
        settings: trSettings,
        sla: trSla,
        reports: trReports,
        notifications: trNotifications,
        dashboard: trDashboard,
        mailboxes: trMailboxes,
        automations: trAutomations,
        profile: trProfile,
        compliance: trCompliance,
        export: trExport,
        "audit-logs": trAuditLogs,
        tenants: trTenants,
        superAdmin: trSuperAdmin,
        billing: trBilling,
        marketing: trMarketing,
        whatsapp: trWhatsapp,
        apiTokens: trApiTokens,
        onboarding: trOnboarding,
        messages: trMessages,
      },
    },
    defaultNS: "common",
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // Order: localStorage → navigator → htmlTag
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "helpdesk-language",
      caches: ["localStorage"],
    },
  });

export default i18n;
