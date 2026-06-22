import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store";
import type { SupportedLanguage } from "./config";
import { SUPPORTED_LANGUAGES } from "./config";

/**
 * Syncs i18next with the Zustand language state.
 * Must be rendered inside both I18nextProvider and the app store provider.
 * Watches the user's `preferredLanguage` from their profile (set at login)
 * and keeps i18next, localStorage, and document.documentElement.lang in sync.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const language = useAppStore((s) => s.language);
  const user = useAppStore((s) => s.user);
  const setLanguage = useAppStore((s) => s.setLanguage);

  // When user logs in with a stored preferredLanguage, apply it
  useEffect(() => {
    const pref = user?.preferredLanguage;
    if (pref && SUPPORTED_LANGUAGES.includes(pref as SupportedLanguage)) {
      const lang = pref as SupportedLanguage;
      if (i18n.resolvedLanguage !== lang) {
        i18n.changeLanguage(lang);
        setLanguage(lang);
        localStorage.setItem("helpdesk-language", lang);
      }
    }
  }, [user?.preferredLanguage]);

  // Keep i18next in sync with Zustand (for manual switches)
  useEffect(() => {
    if (i18n.resolvedLanguage !== language) {
      i18n.changeLanguage(language);
      localStorage.setItem("helpdesk-language", language);
    }
    document.documentElement.lang = language;
  }, [language]);

  return <>{children}</>;
}
