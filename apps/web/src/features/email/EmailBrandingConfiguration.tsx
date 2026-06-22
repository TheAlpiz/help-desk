import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch, api } from "@/lib/api";
import { Button } from "@/components/ui";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Georgia", value: "Georgia, serif" },
];

const SOCIAL_PLATFORMS = [
  "twitter", "linkedin", "facebook", "instagram", "youtube", "github", "tiktok",
] as const;

type SocialLink = { platform: typeof SOCIAL_PLATFORMS[number]; url: string };

interface BrandingForm {
  primaryColor: string;
  secondaryColor: string;
  headerBgColor: string;
  fontFamily: string;
  buttonColor: string;
  buttonBorderRadius: number;
  footerText: string;
  footerBgColor: string;
  companyAddress: string;
  companyPhone: string;
  unsubscribeText: string;
  socialLinks: SocialLink[];
  darkModeEnabled: boolean;
  removeHelpdeskBranding: boolean;
}

const DEFAULTS: BrandingForm = {
  primaryColor: "#2563eb",
  secondaryColor: "#64748b",
  headerBgColor: "#ffffff",
  fontFamily: "Inter, sans-serif",
  buttonColor: "#2563eb",
  buttonBorderRadius: 6,
  footerText: "",
  footerBgColor: "#f8fafc",
  companyAddress: "",
  companyPhone: "",
  unsubscribeText: "",
  socialLinks: [],
  darkModeEnabled: false,
  removeHelpdeskBranding: false,
};

function ColorInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-on-surface mb-1">{label}</label>
      {hint && <p className="text-xs text-on-surface-variant mb-2">{hint}</p>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded border border-outline-variant cursor-pointer bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2563eb"
          className="flex-1 px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm font-mono"
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-on-surface">{label}</p>
        {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
      </label>
    </div>
  );
}

export function EmailBrandingConfiguration() {
  const { t } = useTranslation("settings");
  const qc = useQueryClient();

  const { data: orgBrandingData } = useQuery({
    queryKey: ["org-branding"],
    queryFn: async () => {
      const res = await api.organizations.branding.$get();
      if (!res.ok) throw new Error("Failed to load org branding");
      return res.json();
    },
  });

  const { data: brandingData, isLoading } = useQuery({
    queryKey: ["email-branding"],
    queryFn: async () => {
      const res = await authFetch("/api/email/branding");
      if (!res.ok) throw new Error("Failed to load branding");
      return res.json();
    },
  });

  const [form, setForm] = useState<BrandingForm>(DEFAULTS);

  useEffect(() => {
    const d = brandingData?.data;
    if (!d) return;
    setForm({
      primaryColor: d.primaryColor ?? DEFAULTS.primaryColor,
      secondaryColor: d.secondaryColor ?? DEFAULTS.secondaryColor,
      headerBgColor: d.headerBgColor ?? DEFAULTS.headerBgColor,
      fontFamily: d.fontFamily ?? DEFAULTS.fontFamily,
      buttonColor: d.buttonColor ?? d.primaryColor ?? DEFAULTS.buttonColor,
      buttonBorderRadius: d.buttonBorderRadius ?? DEFAULTS.buttonBorderRadius,
      footerText: d.footerText ?? "",
      footerBgColor: d.footerBgColor ?? DEFAULTS.footerBgColor,
      companyAddress: d.companyAddress ?? "",
      companyPhone: d.companyPhone ?? "",
      unsubscribeText: d.unsubscribeText ?? "",
      socialLinks: d.socialLinks ?? [],
      darkModeEnabled: d.darkModeEnabled ?? false,
      removeHelpdeskBranding: d.removeHelpdeskBranding ?? false,
    });
  }, [brandingData]);

  const set = <K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saveMutation = useMutation({
    mutationFn: async (data: BrandingForm) => {
      const res = await authFetch("/api/email/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save branding");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-branding"] }),
  });

  const addSocialLink = () =>
    set("socialLinks", [...form.socialLinks, { platform: "twitter", url: "" }]);

  const updateSocialLink = (i: number, patch: Partial<SocialLink>) =>
    set("socialLinks", form.socialLinks.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const removeSocialLink = (i: number) =>
    set("socialLinks", form.socialLinks.filter((_, idx) => idx !== i));

  const effectiveButtonColor = form.buttonColor || form.primaryColor;

  if (isLoading) return <div className="p-6 bg-surface-container rounded-xl animate-pulse h-64" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* ── Settings panel ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Colors */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-on-surface">{t("emailBranding.colors", "Colors")}</h3>
          <ColorInput
            label={t("emailBranding.primaryColor", "Primary color")}
            hint={t("emailBranding.primaryColorHint", "Used for links and accents")}
            value={form.primaryColor}
            onChange={(v) => set("primaryColor", v)}
          />
          <ColorInput
            label={t("emailBranding.secondaryColor", "Secondary color")}
            value={form.secondaryColor}
            onChange={(v) => set("secondaryColor", v)}
          />
        </section>

        {/* Header */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-on-surface">{t("emailBranding.header", "Header")}</h3>
          <ColorInput
            label={t("emailBranding.headerBgColor", "Header background")}
            value={form.headerBgColor}
            onChange={(v) => set("headerBgColor", v)}
          />
        </section>

        {/* Font */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-on-surface">{t("emailBranding.typography", "Typography")}</h3>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("emailBranding.fontFamily", "Font family")}
            </label>
            <select
              value={form.fontFamily}
              onChange={(e) => set("fontFamily", e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Button */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-on-surface">{t("emailBranding.button", "CTA Button")}</h3>
          <ColorInput
            label={t("emailBranding.buttonColor", "Button color")}
            hint={t("emailBranding.buttonColorHint", "Leave empty to use primary color")}
            value={form.buttonColor}
            onChange={(v) => set("buttonColor", v)}
          />
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("emailBranding.buttonRadius", "Border radius")} ({form.buttonBorderRadius}px)
            </label>
            <input
              type="range"
              min={0}
              max={24}
              value={form.buttonBorderRadius}
              onChange={(e) => set("buttonBorderRadius", Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </section>

        {/* Footer */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-on-surface">{t("emailBranding.footer", "Footer")}</h3>
          <ColorInput
            label={t("emailBranding.footerBgColor", "Footer background")}
            value={form.footerBgColor}
            onChange={(v) => set("footerBgColor", v)}
          />
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("emailBranding.footerText", "Footer text / legal disclaimer")}
            </label>
            <textarea
              rows={3}
              value={form.footerText}
              onChange={(e) => set("footerText", e.target.value)}
              placeholder={t("emailBranding.footerTextPlaceholder", "© 2025 Acme Inc. All rights reserved.")}
              className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("emailBranding.companyAddress", "Company address")}
            </label>
            <input
              type="text"
              value={form.companyAddress}
              onChange={(e) => set("companyAddress", e.target.value)}
              placeholder="123 Main St, City, Country"
              className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("emailBranding.companyPhone", "Company phone")}
            </label>
            <input
              type="text"
              value={form.companyPhone}
              onChange={(e) => set("companyPhone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {t("emailBranding.unsubscribeText", "Unsubscribe / opt-out text")}
            </label>
            <input
              type="text"
              value={form.unsubscribeText}
              onChange={(e) => set("unsubscribeText", e.target.value)}
              placeholder="To unsubscribe, reply STOP to this email."
              className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm"
            />
          </div>
        </section>

        {/* Social links */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface">{t("emailBranding.socialLinks", "Social links")}</h3>
            <button
              type="button"
              onClick={addSocialLink}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("emailBranding.addSocialLink", "Add")}
            </button>
          </div>
          {form.socialLinks.length === 0 && (
            <p className="text-xs text-on-surface-variant">{t("emailBranding.noSocialLinks", "No social links added.")}</p>
          )}
          {form.socialLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={link.platform}
                onChange={(e) => updateSocialLink(i, { platform: e.target.value as SocialLink["platform"] })}
                className="px-2 py-1.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs capitalize w-32 shrink-0"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateSocialLink(i, { url: e.target.value })}
                placeholder="https://..."
                className="flex-1 px-2 py-1.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={() => removeSocialLink(i)}
                className="text-on-surface-variant/50 hover:text-error shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </section>

        {/* Misc toggles */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-1 divide-y divide-outline-variant">
          <Toggle
            label={t("emailBranding.darkMode", "Dark mode support")}
            hint={t("emailBranding.darkModeHint", "Adds prefers-color-scheme media queries to email HTML")}
            checked={form.darkModeEnabled}
            onChange={(v) => set("darkModeEnabled", v)}
          />
          <Toggle
            label={t("emailBranding.removeHelpdeskBranding", "Remove platform branding")}
            hint={t("emailBranding.removeHelpdeskBrandingHint", "Hides 'Powered by Alpis' in the footer")}
            checked={form.removeHelpdeskBranding}
            onChange={(v) => set("removeHelpdeskBranding", v)}
          />
        </section>

        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            {saveMutation.isPending
              ? t("emailBranding.saving", "Saving…")
              : t("emailBranding.save", "Save branding")}
          </Button>
        </div>
      </div>

      {/* ── Live preview ────────────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-6 self-start">
        <div
          className="rounded-xl overflow-hidden shadow-lg border border-outline-variant"
          style={{ fontFamily: form.fontFamily }}
        >
          {/* Header */}
          <div
            className="px-8 py-6 flex items-center justify-center border-b border-gray-100"
            style={{ backgroundColor: form.headerBgColor }}
          >
            {(orgBrandingData as any)?.data?.logoUrl ? (
              <img
                src={(orgBrandingData as any).data.logoUrl}
                alt="Company Logo"
                className="h-10 object-contain"
              />
            ) : (
              <div className="h-10 flex items-center justify-center text-gray-400 italic text-sm">
                Your logo here
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-8 py-6 bg-white space-y-4">
            <h1 className="text-xl font-semibold text-gray-900">Your ticket has been updated</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Hello there,<br /><br />
              We wanted to let you know that there has been an update to ticket #1024. Our team is
              actively working to resolve your issue.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-sm text-gray-700 italic">
              "I have investigated the issue and pushed a fix. Please verify on your end."
            </div>
            <div className="pt-2">
              <a
                href="#"
                className="inline-block px-5 py-2.5 text-white text-sm font-medium no-underline"
                style={{
                  backgroundColor: effectiveButtonColor,
                  borderRadius: `${form.buttonBorderRadius}px`,
                }}
              >
                View ticket
              </a>
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-8 py-5 text-center text-xs text-gray-500 border-t border-gray-100 space-y-1.5"
            style={{ backgroundColor: form.footerBgColor }}
          >
            {form.companyAddress && <p>{form.companyAddress}</p>}
            {form.companyPhone && <p>{form.companyPhone}</p>}
            {form.footerText && <p className="text-gray-400">{form.footerText}</p>}
            {form.socialLinks.length > 0 && (
              <div className="flex items-center justify-center gap-3 pt-1">
                {form.socialLinks.map((l, i) => (
                  <span key={i} className="capitalize text-gray-400">{l.platform}</span>
                ))}
              </div>
            )}
            {form.unsubscribeText && <p className="text-gray-400 text-[10px]">{form.unsubscribeText}</p>}
            {!form.removeHelpdeskBranding && (
              <p className="text-gray-300 text-[10px] pt-1">Powered by Alpis Help Desk</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
