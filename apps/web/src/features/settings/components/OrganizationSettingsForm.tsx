import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import { updateOrganizationSchema } from "@help-desk/shared";
import { Button, Input, FormError, FormAlert, fieldErrors } from "@/components/ui";

export function OrganizationSettingsForm() {
  const tenantId = useAppStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["organization", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await api.organizations[":id"].$get({ param: { id: tenantId } });
      if (!res.ok) throw new Error("Failed to fetch organization settings");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const org = (response as any)?.data;

  const form = useForm({
    defaultValues: {
      name: org?.name ?? "",
      domain: org?.domain ?? "",
    },
    validators: { onChange: updateOrganizationSchema.pick({ name: true, domain: true }) },
    onSubmit: async ({ value }) => {
      if (!tenantId) return;
      setApiError(null);
      setSaved(false);
      try {
        const state = useAppStore.getState();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (state.accessToken) headers["Authorization"] = `Bearer ${state.accessToken}`;
        if (state.tenantId) headers["X-Tenant-ID"] = state.tenantId;
        const res = await fetch(`/api/organizations/${tenantId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(value),
        });
        const body = (await res.json()) as any;
        if (!res.ok) { setApiError(body?.error?.message || body?.message || "Failed to save settings"); return; }
        queryClient.invalidateQueries({ queryKey: ["organization", tenantId] });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err: any) { setApiError(err.message || "An error occurred"); }
    },
  });

  if (isLoading || !org) {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-1/3" />
          <div className="h-10 bg-white/5 rounded" />
          <div className="h-4 bg-white/5 rounded w-1/4 mt-6" />
          <div className="h-10 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-error text-sm">Error loading organization settings.</div>;
  }

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-6 max-w-2xl">
      <form
        onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}
        className="space-y-5"
      >
        {apiError && <FormAlert>{apiError}</FormAlert>}
        {saved && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
            Settings saved successfully.
          </div>
        )}

        <form.Field
          name="name"
          validators={{ onChange: z.string().min(1, "Name is required") }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">Organization Name *</label>
              <Input
                dense
                type="text"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )}
        />

        <form.Field
          name="domain"
          validators={{ onChange: z.string().min(1, "Domain is required") }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">Custom Domain *</label>
              <div className="flex rounded-lg overflow-hidden border border-outline-variant focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/60 transition-colors">
                <span className="inline-flex items-center px-3 bg-surface-container-high border-r border-outline-variant text-on-surface-variant text-xs shrink-0">
                  https://
                </span>
                <input
                  type="text"
                  className="flex-1 px-3 py-2 bg-surface-container-high text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-on-surface">Status</label>
          <div className="flex items-center gap-3">
            <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${
              org.status === "active"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                : "bg-white/8 text-on-surface-variant border-white/10"
            }`}>
              {org.status}
            </span>
            <p className="text-xs text-on-surface-variant/40">Status managed by super admins.</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <form.Subscribe
            selector={(s) => [s.canSubmit, s.isSubmitting, s.isDirty]}
            children={([canSubmit, isSubmitting, isDirty]) => (
              <Button type="submit" disabled={!canSubmit || !isDirty} loading={isSubmitting}>
                Save Changes
              </Button>
            )}
          />
        </div>
      </form>
    </div>
  );
}
