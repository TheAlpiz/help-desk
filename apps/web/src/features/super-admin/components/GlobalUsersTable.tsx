import { useState } from "react";
import { api, apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { parseResponse } from "hono/client";
import { z } from "zod";
import { X, Pencil, Trash2, Users, UserCheck, ShieldCheck, UserCog } from "lucide-react";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";

type GlobalUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string;
  status: string;
  organizationId: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
};

const GLOBAL_ROLES = ["REQUESTER", "AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"] as const;

const ROLE_CLS: Record<string, string> = {
  SUPER_ADMIN: "bg-primary/15 text-primary border border-primary/20",
  ADMIN: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
  SUPERVISOR: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  AGENT: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  REQUESTER: "bg-white/8 text-on-surface-variant border border-white/10",
};

const selectCls =
  "w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";

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

function EditGlobalUserModal({ user, onClose }: { user: GlobalUser; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      globalRole: user.globalRole,
      status: (user.status === "active" || user.status === "inactive" ? user.status : "active") as "active" | "inactive",
    },
    validators: { onChange: z.object({ firstName: z.string().min(1), lastName: z.string().min(1), globalRole: z.string(), status: z.enum(["active", "inactive"]) }) },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const { res, body } = await apiFetch(`/users/${user.id}`, { method: "PUT", body: JSON.stringify(value) });
        if (!res.ok) { setError(body?.error?.message || body?.message || "Failed to update user"); return; }
        queryClient.invalidateQueries({ queryKey: ["global-users"] });
        onClose();
      } catch (err: any) { setError(err.message || "An error occurred"); }
    },
  });

  return (
    <ModalShell title="Edit User" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>

        <div className="px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg">
          <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider mb-0.5">Email (read-only)</p>
          <p className="text-sm text-on-surface">{user.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="firstName" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">First Name</label>
              <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
          <form.Field name="lastName" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">Last Name</label>
              <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
        </div>

        <form.Field name="globalRole" children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Global Role</label>
            <select className={selectCls} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)}>
              {GLOBAL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )} />

        <form.Field name="status" children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Status</label>
            <select className={selectCls} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value as "active" | "inactive")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )} />

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && "Save Changes"}
            </Button>
          )} />
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteGlobalUserModal({ user, onClose }: { user: GlobalUser; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { res, body } = await apiFetch(`/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed to delete user");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["global-users"] }); onClose(); },
  });

  return (
    <ModalShell title="Delete User" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-on-surface-variant">
          Delete <span className="font-semibold text-on-surface">{user.firstName} {user.lastName}</span> ({user.email})? Cannot be undone.
        </p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && "Delete User"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function GlobalUsersTable() {
  const [editUser, setEditUser] = useState<GlobalUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<GlobalUser | null>(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["global-users"],
    queryFn: async () => {
      const res = await api.users.global.$get();
      return parseResponse(res) as Promise<{ data: GlobalUser[] }>;
    },
  });

  const users: GlobalUser[] = (response as any)?.data ?? [];
  const activeCount = users.filter((u) => u.status === "active").length;
  const adminCount = users.filter((u) => u.globalRole === "ADMIN" || u.globalRole === "SUPER_ADMIN").length;

  return (
    <>
      {editUser && <EditGlobalUserModal user={editUser} onClose={() => setEditUser(null)} />}
      {deleteUser && <DeleteGlobalUserModal user={deleteUser} onClose={() => setDeleteUser(null)} />}

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total Users", value: users.length, icon: <Users className="w-4 h-4" />, accent: "text-primary" },
          { label: "Active", value: activeCount, icon: <UserCheck className="w-4 h-4" />, accent: "text-emerald-300" },
          { label: "Admins", value: adminCount, icon: <ShieldCheck className="w-4 h-4" />, accent: "text-violet-300" },
          { label: "Inactive", value: users.length - activeCount, icon: <UserCog className="w-4 h-4" />, accent: "text-on-surface-variant" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ${s.accent}`}>{s.icon}</div>
            <div>
              <p className={`text-xl font-bold tracking-tight ${s.accent}`}>{isLoading ? "—" : s.value}</p>
              <p className="text-[11px] text-on-surface-variant/50">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load users.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <span className="text-sm font-medium text-on-surface">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded ${ROLE_CLS[u.globalRole] ?? "bg-white/8 text-on-surface-variant"}`}>
                      {u.globalRole}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${u.status === "active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-white/8 text-on-surface-variant border-white/10"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60 hidden lg:table-cell">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditUser(u)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteUser(u)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
                      <p className="text-sm font-medium text-on-surface">No users found</p>
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
