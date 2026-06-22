import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Plus, X, Pencil, Trash2, Users, CheckSquare, Square, ChevronDown, XCircle, Check } from "lucide-react";
import { api } from "@/lib/api";
import { inviteUserSchema, updateUserSchema } from "@help-desk/shared";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";

type User = {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string;
  status: string;
  departmentId: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
};

const GLOBAL_ROLES = ["REQUESTER", "AGENT", "SUPERVISOR", "ADMIN"] as const;

const ROLE_CLS: Record<string, string> = {
  ADMIN: "bg-primary/15 text-primary border border-primary/20",
  SUPERVISOR: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
  AGENT: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  REQUESTER: "bg-white/8 text-on-surface-variant border border-white/10",
};

const selectCls =
  "w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-colors";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("users");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", firstName: "", lastName: "", globalRole: "AGENT", password: "" },
    validators: { onChange: inviteUserSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const { password, ...rest } = value;
        const res = await api.users.index.$post({ json: { ...rest, password } });
        const body = await res.json() as any;
        if (!res.ok) { setError(body?.error?.message || body?.message || t("invite.failed")); return; }
        queryClient.invalidateQueries({ queryKey: ["users"] });
        onClose();
      } catch (err: any) { setError(err.message || t("invite.error")); }
    },
  });

  return (
    <ModalShell title={t("invite.title")} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="firstName" validators={{ onChange: z.string().min(1, t("invite.required")) }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("invite.firstNameLabel")}</label>
              <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Jane" />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
          <form.Field name="lastName" validators={{ onChange: z.string().min(1, t("invite.required")) }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("invite.lastNameLabel")}</label>
              <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Smith" />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
        </div>

        <form.Field name="email" validators={{ onChange: z.string().email(t("invite.invalidEmail")) }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("invite.emailLabel")}</label>
            <Input dense type="email" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="jane@company.com" />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />

        <form.Field name="globalRole" children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("invite.roleLabel")}</label>
            <select className={selectCls} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)}>
              {GLOBAL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )} />

        <form.Field name="password" validators={{ onChange: z.string().min(8, t("invite.minPassword")) }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("invite.passwordLabel")}</label>
            <Input dense type="password" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>{t("invite.cancel")}</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && t("invite.submit")}
            </Button>
          )} />
        </div>
      </form>
    </ModalShell>
  );
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { t } = useTranslation("users");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      globalRole: user.globalRole,
      status: (user.status === "active" || user.status === "inactive" ? user.status : "active") as "active" | "inactive",
    },
    validators: { onChange: updateUserSchema as any },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const res = await api.users[":id"].$put({ param: { id: user.id }, json: value });
        const body = await res.json() as any;
        if (!res.ok) { setError(body?.error?.message || body?.message || t("editModal.failed")); return; }
        queryClient.invalidateQueries({ queryKey: ["users"] });
        onClose();
      } catch (err: any) { setError(err.message || t("editModal.error")); }
    },
  });

  return (
    <ModalShell title={t("editModal.title")} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="firstName" validators={{ onChange: z.string().min(1, t("editModal.required")) }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("editModal.firstNameLabel")}</label>
              <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
          <form.Field name="lastName" validators={{ onChange: z.string().min(1, t("editModal.required")) }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("editModal.lastNameLabel")}</label>
              <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
        </div>

        <form.Field name="globalRole" children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("editModal.roleLabel")}</label>
            <select className={selectCls} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)}>
              {GLOBAL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )} />

        <form.Field name="status" children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("editModal.statusLabel")}</label>
            <select className={selectCls} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value as "active" | "inactive")}>
              <option value="active">{t("editModal.statusActive")}</option>
              <option value="inactive">{t("editModal.statusInactive")}</option>
            </select>
          </div>
        )} />

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>{t("editModal.cancel")}</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && t("editModal.save")}
            </Button>
          )} />
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteUserConfirm({ user, onClose }: { user: User; onClose: () => void }) {
  const { t } = useTranslation("users");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.users[":id"].$delete({ param: { id: user.id } });
      const body = await res.json() as any;
      if (!res.ok) throw new Error(body?.error?.message || body?.message || t("deleteModal.failed"));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); onClose(); },
  });

  return (
    <ModalShell title={t("deleteModal.title")} onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-on-surface-variant">
          {t("deleteModal.confirm", { name: `${user.firstName} ${user.lastName}`, email: user.email })}
        </p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t("deleteModal.cancel")}</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && t("deleteModal.remove")}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function UserDetailDrawer({ user, onClose, onEdit }: { user: User; onClose: () => void; onEdit: () => void }) {
  const { t } = useTranslation("users");
  const qc = useQueryClient();

  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await api.departments.index.$get();
      const body = await res.json() as any;
      return body ?? { data: [] };
    },
  });

  const { data: userDeptIds } = useQuery({
    queryKey: ["user-departments", user.id],
    queryFn: async () => {
      const res = await (api.users[":id"] as any).departments.$get({ param: { id: user.id } });
      const body = await res.json() as any;
      return (body?.data ?? body ?? []) as string[];
    },
  });

  const departments: any[] = (deptsData as any)?.data ?? [];
  const [localDeptIds, setLocalDeptIds] = useState<Set<string> | null>(null);
  const currentDeptIds = localDeptIds ?? new Set<string>(userDeptIds ?? []);

  const assignDept = useMutation({
    mutationFn: async (departmentId: string) => {
      const res = await api.departments[":id"].members.$post({
        param: { id: departmentId },
        json: { userId: user.id },
      });
      if (!res.ok) throw new Error("Failed");
      return departmentId;
    },
    onSuccess: (departmentId) => {
      setLocalDeptIds((prev) => new Set([...(prev ?? currentDeptIds), departmentId]));
      qc.invalidateQueries({ queryKey: ["user-departments", user.id] });
    },
  });

  const unassignDept = useMutation({
    mutationFn: async (departmentId: string) => {
      const res = await api.departments[":id"].members[":userId"].$delete({
        param: { id: departmentId, userId: user.id },
      });
      if (!res.ok) throw new Error("Failed");
      return departmentId;
    },
    onSuccess: (departmentId) => {
      setLocalDeptIds((prev) => {
        const next = new Set(prev ?? currentDeptIds);
        next.delete(departmentId);
        return next;
      });
      qc.invalidateQueries({ queryKey: ["user-departments", user.id] });
    },
  });

  const busy = assignDept.isPending || unassignDept.isPending;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog" aria-label={`${user.firstName} ${user.lastName} details`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-container border-l border-outline-variant flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">{t("drawer.title")}</h3>
          <button onClick={onClose} aria-label={t("drawer.close")} className="text-on-surface-variant/40 hover:text-on-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-xl font-bold text-primary">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-on-surface-variant/60">{user.email}</p>
              <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded mt-1 ${ROLE_CLS[user.globalRole] ?? "bg-white/8 text-on-surface-variant"}`}>
                {t(`roles.${user.globalRole}`, { defaultValue: user.globalRole })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/3 rounded-lg p-3">
              <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{t("drawer.statusLabel")}</p>
              <p className={`text-xs font-semibold mt-0.5 ${user.status === "active" ? "text-emerald-400" : "text-on-surface-variant/50"}`}>{t(`statuses.${user.status}`, { defaultValue: user.status })}</p>
            </div>
            <div className="bg-white/3 rounded-lg p-3">
              <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{t("drawer.lastLoginLabel")}</p>
              <p className="text-xs font-mono text-on-surface-variant/60 mt-0.5">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : t("drawer.neverLoggedIn")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("drawer.departmentLabel")}</p>
            <div className="space-y-1">
              {departments.map((d: any) => {
                const isMember = currentDeptIds.has(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => (isMember ? unassignDept.mutate(d.id) : assignDept.mutate(d.id))}
                    disabled={busy}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-colors disabled:opacity-40 group ${
                      isMember
                        ? "bg-primary/10 border-primary/30 text-on-surface"
                        : "text-on-surface-variant border-transparent hover:bg-primary/5 hover:border-primary/20 hover:text-on-surface"
                    }`}
                  >
                    {d.name}
                    {isMember ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-primary group-hover:hidden" />
                        <X className="w-3.5 h-3.5 text-error hidden group-hover:block" />
                      </>
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-primary/60" />
                    )}
                  </button>
                );
              })}
              {departments.length === 0 && <p className="text-xs text-on-surface-variant/30">No departments</p>}
            </div>
          </div>

          {user.createdAt && (
            <p className="text-[10px] font-mono text-on-surface-variant/30">
              {t("drawer.joined", { date: new Date(user.createdAt).toLocaleDateString() })}
            </p>
          )}
        </div>
        <div className="p-4 border-t border-outline-variant">
          <Button fullWidth onClick={() => { onClose(); onEdit(); }}>
            <Pencil className="w-3.5 h-3.5" />
            {t("drawer.editButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UsersTable() {
  const { t } = useTranslation("users");
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRoleOpen, setBulkRoleOpen] = useState(false);
  const qc = useQueryClient();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.users.index.$get();
      const body = await res.json() as any;
      return body as { data: User[] };
    },
  });

  const users: User[] = response?.data ?? [];
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(users.map((u) => u.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkDeactivateMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([...selected].map((id) => api.users[":id"].$put({ param: { id }, json: { status: "inactive" } })));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setSelected(new Set()); },
  });

  const bulkRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      await Promise.all([...selected].map((id) => api.users[":id"].$put({ param: { id }, json: { globalRole: role } })));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setSelected(new Set()); setBulkRoleOpen(false); },
  });

  return (
    <>
      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
      {deleteUser && <DeleteUserConfirm user={deleteUser} onClose={() => setDeleteUser(null)} />}
      {detailUser && (
        <UserDetailDrawer
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={() => setEditUser(detailUser)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant/50">{t("table.manageSubtitle")}</p>
        <Button onClick={() => setShowInvite(true)}>
          <Plus className="w-4 h-4" />
          {t("invite.title")}
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/8 border border-primary/20 rounded-xl mb-3 flex-wrap">
          <span className="text-xs font-semibold text-primary">{t("table.selected", { count: selected.size })}</span>
          <div className="flex-1" />
          <Button variant="secondary" onClick={() => bulkDeactivateMutation.mutate()} disabled={bulkDeactivateMutation.isPending}>
            {t("table.deactivate")}
          </Button>
          <div className="relative">
            <Button variant="secondary" onClick={() => setBulkRoleOpen((v) => !v)}>
              {t("table.changeRole")} <ChevronDown className="w-3 h-3" />
            </Button>
            {bulkRoleOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-surface-container border border-outline-variant rounded-lg shadow-xl z-10 overflow-hidden">
                {GLOBAL_ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => bulkRoleMutation.mutate(r)}
                    disabled={bulkRoleMutation.isPending}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setSelected(new Set())} className="p-1 text-on-surface-variant/40 hover:text-on-surface transition-colors" aria-label={t("table.clearSelection")}>
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">{t("table.failedLoad")}</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 w-8">
                  <button onClick={toggleAll} aria-label={allSelected ? t("table.deselectAll") : t("table.selectAll")} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
                    {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.colName")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden md:table-cell">{t("table.colEmail")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.colRole")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.colStatus")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">{t("table.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.map((u) => {
                const isSel = selected.has(u.id);
                return (
                  <tr key={u.id} className={`hover:bg-white/3 transition-colors cursor-pointer ${isSel ? "bg-primary/5" : ""}`} onClick={() => setDetailUser(u)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleOne(u.id)} aria-label={isSel ? t("table.deselect") : t("table.select")} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
                        {isSel ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="text-sm font-medium text-on-surface">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant/60 hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded ${ROLE_CLS[u.globalRole] ?? "bg-white/8 text-on-surface-variant"}`}>
                        {t(`roles.${u.globalRole}`, { defaultValue: u.globalRole })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${u.status === "active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-white/8 text-on-surface-variant border-white/10"}`}>
                        {t(`statuses.${u.status}`, { defaultValue: u.status })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditUser(u); }} className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors" title={t("table.editTitle")}><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteUser(u); }} className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors" title={t("table.removeTitle")}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
                      <p className="text-sm font-medium text-on-surface">{t("table.noUsers")}</p>
                      <button onClick={() => setShowInvite(true)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">{t("table.inviteFirst")}</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
