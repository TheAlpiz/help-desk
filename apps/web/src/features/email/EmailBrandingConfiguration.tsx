import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch, api } from "@/lib/api";
import { Button } from "@/components/ui";
import { useTranslation } from "react-i18next";

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

  const { data: brandingData, isLoading: isLoadingBranding } = useQuery({
    queryKey: ["email-branding"],
    queryFn: async () => {
      const res = await authFetch("/api/email/branding");
      if (!res.ok) throw new Error("Failed to load branding");
      return res.json();
    },
  });

  const [brandingForm, setBrandingForm] = useState({
    fontFamily: "Inter, sans-serif",
    removeHelpdeskBranding: false,
  });

  useEffect(() => {
    if (brandingData?.data) {
      setBrandingForm({
        fontFamily: brandingData.data.fontFamily || "Inter, sans-serif",
        removeHelpdeskBranding: brandingData.data.removeHelpdeskBranding || false,
      });
    }
  }, [brandingData]);

  const saveBrandingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await authFetch("/api/email/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save branding");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-branding"] });
    }
  });

  if (isLoadingBranding) return <div className="p-6 bg-surface-container rounded-xl animate-pulse h-64" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-6">
          <div>
            <h3 className="font-medium text-on-surface mb-1">{t("emailBranding.title")}</h3>
            <p className="text-sm text-on-surface-variant mb-6">{t("emailBranding.description")}</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">{t("emailBranding.fontFamily")}</label>
              <p className="text-xs text-on-surface-variant mb-2">{t("emailBranding.fontFamilyHint")}</p>
              <select
                value={brandingForm.fontFamily}
                onChange={(e) => setBrandingForm(prev => ({ ...prev, fontFamily: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm"
              >
                <option value="Inter, sans-serif">Inter</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Helvetica, sans-serif">Helvetica</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-outline-variant mt-4 pt-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">{t("emailBranding.removeHelpdeskBranding")}</label>
                <p className="text-xs text-on-surface-variant">{t("emailBranding.removeHelpdeskBrandingHint")}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={brandingForm.removeHelpdeskBranding}
                  onChange={(e) => setBrandingForm(prev => ({ ...prev, removeHelpdeskBranding: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              onClick={() => saveBrandingMutation.mutate(brandingForm)}
              disabled={saveBrandingMutation.isPending}
            >
              {saveBrandingMutation.isPending ? t("emailBranding.saving") : t("emailBranding.save")}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div 
          className="bg-white rounded-xl overflow-hidden shadow-lg border border-outline-variant sticky top-6"
          style={{ fontFamily: brandingForm.fontFamily }}
        >
          <div className="p-8 text-center border-b border-gray-100 bg-gray-50/50">
            {(orgBrandingData as any)?.data?.logoUrl ? (
              <img src={(orgBrandingData as any).data.logoUrl} alt="Company Logo" className="h-12 mx-auto object-contain" />
            ) : (
              <div className="h-12 flex items-center justify-center text-gray-400 italic text-sm">No Logo Set</div>
            )}
          </div>
          <div className="p-8 space-y-6">
            <h1 className="text-2xl font-semibold text-gray-900">Your Ticket Has Been Updated</h1>
            <p className="text-gray-600 leading-relaxed text-sm">
              Hello there,<br /><br />
              We wanted to let you know that there has been an update to your ticket #1024. Our team is working hard to resolve your issue as quickly as possible.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-sm text-gray-700 italic">"I have investigated the issue and pushed a fix. Please verify if it works for you now."</p>
            </div>
            <div className="pt-4 text-center">
              <a 
                href="#" 
                className="inline-block px-6 py-3 text-white font-medium rounded-lg no-underline transition-opacity hover:opacity-90 text-sm"
                style={{ backgroundColor: (orgBrandingData as any)?.data?.brandColor || "#2563eb" }}
              >
                View Ticket
              </a>
            </div>
          </div>
          <div className="p-6 bg-gray-50 text-center text-xs text-gray-500 border-t border-gray-100">
            <p>123 Business Road, Suite 100, City, Country</p>
            {!brandingForm.removeHelpdeskBranding && (
              <p className="mt-2 text-gray-400">Powered by Helpdesk Platform</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
