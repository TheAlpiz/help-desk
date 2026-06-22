import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from "@/i18n";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  /** "dropdown" renders a popover; "inline" renders pill buttons */
  variant?: "dropdown" | "inline";
  className?: string;
  /** Optional callback fired after the language changes (e.g. to persist to backend) */
  onLanguageChange?: (lang: SupportedLanguage) => void;
}

export function LanguageSwitcher({ variant = "dropdown", className, onLanguageChange }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const setLanguage = useAppStore((s) => s.setLanguage);

  const current = (i18n.resolvedLanguage ?? "en") as SupportedLanguage;

  const change = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
    // Persist in localStorage for LanguageDetector to pick up on reload
    localStorage.setItem("helpdesk-language", lang);
    onLanguageChange?.(lang);
  };

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => change(lang)}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
              current === lang
                ? "bg-primary/15 text-primary border-primary/20"
                : "text-on-surface-variant border-outline-variant hover:bg-white/5",
            )}
          >
            {LANGUAGE_NAMES[lang]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("relative group", className)}>
      <button
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-white/5 hover:text-on-surface transition-colors"
        aria-label="Change language"
      >
        <Languages className="w-3.5 h-3.5" />
        <span className="uppercase font-mono">{current}</span>
      </button>

      <div className="absolute bottom-full mb-1 left-0 min-w-[120px] bg-surface-container-high border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => change(lang)}
            className={cn(
              "w-full text-left px-3 py-2.5 text-xs transition-colors border-b border-outline-variant/50 last:border-0",
              current === lang
                ? "bg-primary/10 text-primary font-semibold"
                : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
            )}
          >
            {LANGUAGE_NAMES[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
