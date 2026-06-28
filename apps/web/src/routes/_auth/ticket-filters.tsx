import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ShieldOff, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Input, FormAlert } from "@/components/ui";
import { useAppStore } from "@/store";
import {
  TICKET_FILTER_FIELDS,
  type CreateTicketFilterInput,
  type TicketFilterField,
} from "@help-desk/shared";

export const Route = createFileRoute("/_auth/ticket-filters")({
  component: TicketFiltersPage,
});

type Rule = {
  id: string;
  name: string;
  field: TicketFilterField;
  value: string;
  action: string;
  isActive: boolean;
};

function TicketFiltersPage() {
  const { t } = useTranslation("ticketFilters");
  const queryClient = useQueryClient();
  const role = useAppStore((s) => s.user?.globalRole);
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const [form, setForm] = useState<CreateTicketFilterInput>({
    name: "",
    field: "sender_email",
    value: "",
    action: "drop",
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ticket-filters"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await api.ticketFilters.index.$get();
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });
  const rules: Rule[] = ((data as any)?.data ?? []) as Rule[];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ticket-filters"] });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await api.ticketFilters.index.$post({ json: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})) as any)?.error?.message ?? "Failed");
    },
    onSuccess: () => {
      setForm({ name: "", field: "sender_email", value: "", action: "drop", isActive: true });
      setError(null);
      invalidate();
    },
    onError: (e: any) => setError(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async (r: Rule) => {
      await api.ticketFilters[":id"].$put({ param: { id: r.id }, json: { isActive: !r.isActive } });
    },
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.ticketFilters[":id"].$delete({ param: { id } });
    },
    onSuccess: invalidate,
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-sm text-on-surface-variant/60">
        <ShieldOff className="w-6 h-6 mx-auto mb-2 opacity-40" />
        {t("adminOnly")}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-2.5">
        <Filter className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
          <p className="text-xs text-on-surface-variant/60">{t("subtitle")}</p>
        </div>
      </div>

      {/* Create form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate();
        }}
        className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3"
      >
        <FormAlert>{error ?? undefined}</FormAlert>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant/70">{t("fields.name")}</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("placeholders.name")}
              required
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant/70">{t("fields.field")}</label>
            <select
              value={form.field}
              onChange={(e) => setForm({ ...form, field: e.target.value as TicketFilterField })}
              className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {TICKET_FILTER_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {t(`matchFields.${f}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-medium text-on-surface-variant/70">{t("fields.value")}</label>
            <Input
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={t(`placeholders.${form.field}`)}
              required
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={createMut.isPending}>
            <Plus className="w-4 h-4" />
            {t("save")}
          </Button>
        </div>
      </form>

      {/* Rules list */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-on-surface-variant/40">…</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant/40">{t("empty")}</div>
        ) : (
          <div className="divide-y divide-outline-variant/30">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{r.name}</p>
                  <p className="text-[11px] text-on-surface-variant/60">
                    {t(`matchFields.${r.field}`)} · <span className="font-mono">{r.value}</span> → {t(`actions.${r.action}`, { defaultValue: r.action })}
                  </p>
                </div>
                <button
                  onClick={() => toggleMut.mutate(r)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                    r.isActive
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                      : "bg-white/5 text-on-surface-variant/50 border-outline-variant"
                  }`}
                >
                  {r.isActive ? t("active") : t("inactive")}
                </button>
                <button
                  onClick={() => deleteMut.mutate(r.id)}
                  aria-label={t("delete")}
                  className="text-on-surface-variant/40 hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
