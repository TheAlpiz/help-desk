import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Plus, X, Pencil, Trash2, Users, CheckSquare, Square, ChevronDown, XCircle, Check } from "lucide-react";
import { useAppStore } from "@/store";
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

function getAuthHeaders() {
  const state = useAppStore.getState();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (state.accessToken) headers["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) headers["X-Tenant-ID"] = state.tenantId;
  return headers;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`/api${path}`, { ...init, headers: { ...getAuthHeaders(), ...(init.headers ?? {}) } });
  const body = await res.json();
  return { res, body };
}

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
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", firstName: "", lastName: "", globalRole: "AGENT", password: "" },
    validators: { onChange: inviteUserSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const { password, ...rest } = value;
        const { res, body } = await apiFetch("/users", { method: "POST", body: JSON.stringify({ ...rest, passwordHash: password }) });
        if (!res.ok) { setError(body?.error?.message || body?.message || "Failed to invite user"); return; }
        queryClient.invalidateQueries({ queryKey: ["users"] });
        onClose();
      } catch (err: any) { setError(err.message || "An error occurred"); }
    },
  });

  return (
    <ModalShell title="Invite User" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="firstName" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">First Name *</label>
              <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Jane" />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
          <form.Field name="lastName" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">Last Name *</label>
              <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Smith" />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
        </div>

        <form.Field name="email" validators={{ onChange: z.string().email("Invalid email") }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Email *</label>
            <Input dense type="email" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="jane@company.com" />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />

        <form.Field name="globalRole" children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Role *</label>
            <select className={selectCls} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)}>
              {GLOBAL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )} />

        <form.Field name="password" validators={{ onChange: z.string().min(8, "Min 8 characters") }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Temporary Password *</label>
            <Input dense type="password" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && "Invite User"}
            </Button>
          )} />
        </div>
      </form>
    </ModalShell>
  );
}

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      globalRole: user.globalRole,
      status: (user.status === "active" || user.status === "inactive" ? user.status : "active") as "active" | "inactive",
    },
    validators: { onChange: updateUserSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const { res, body } = await apiFetch(`/users/${user.id}`, { method: "PUT", body: JSON.stringify(value) });
        if (!res.ok) { setError(body?.error?.message || body?.message || "Failed to update user"); return; }
        queryClient.invalidateQueries({ queryKey: ["users"] });
        onClose();
      } catch (err: any) { setError(err.message || "An error occurred"); }
    },
  });

  return (
    <ModalShell title="Edit User" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>

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
            <label className="text-xs font-medium text-on-surface">Role</label>
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

function DeleteUserConfirm({ user, onClose }: { user: User; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { res, body } = await apiFetch(`/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed to delete");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); onClose(); },
  });

  return (
    <ModalShell title="Remove User" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-on-surface-variant">
          Remove <span className="font-semibold text-on-surface">{user.firstName} {user.lastName}</span> ({user.email})? Cannot be undone.
        </p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && "Remove"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function UserDetailDrawer({ user, onClose, onEdit }: { user: User; onClose: () => void; onEdit: () => void }) {
  const qc = useQueryClient();

  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { body } = await apiFetch("/departments");
      return body ?? { data: [] };
    },
  });

  const departments: any[] = (deptsData as any)?.data ?? [];

  // Prop `user` is frozen parent state; track current membership locally so the
  // panel reflects assign/unassign without reopening.
  const [currentDeptId, setCurrentDeptId] = useState<string | null>(user.departmentId ?? null);

  const assignDept = useMutation({
    mutationFn: async (departmentId: string) => {
      const { res } = await apiFetch(`/departments/${departmentId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error("Failed");
      return departmentId;
    },
    onSuccess: (departmentId) => {
      setCurrentDeptId(departmentId);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const unassignDept = useMutation({
    mutationFn: async (departmentId: string) => {
      const { res } = await apiFetch(`/departments/${departmentId}/members/${user.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setCurrentDeptId(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const busy = assignDept.isPending || unassignDept.isPending;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog" aria-label={`${user.firstName} ${user.lastName} details`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-container border-l border-outline-variant flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">User detail</h3>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-variant/40 hover:text-on-surface transition-colors">
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
                {user.globalRole}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/3 rounded-lg p-3">
              <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">Status</p>
              <p className={`text-xs font-semibold mt-0.5 ${user.status === "active" ? "text-emerald-400" : "text-on-surface-variant/50"}`}>{user.status}</p>
            </div>
            <div className="bg-white/3 rounded-lg p-3">
              <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">Last login</p>
              <p className="text-xs font-mono text-on-surface-variant/60 mt-0.5">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Department</p>
            <div className="space-y-1">
              {departments.map((d: any) => {
                const isMember = d.id === currentDeptId;
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
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="p-4 border-t border-outline-variant">
          <Button fullWidth onClick={() => { onClose(); onEdit(); }}>
            <Pencil className="w-3.5 h-3.5" />
            Edit user
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UsersTable() {
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
      const { body } = await apiFetch("/users");
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
      await Promise.all([...selected].map((id) => apiFetch(`/users/${id}`, { method: "PUT", body: JSON.stringify({ status: "inactive" }) })));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setSelected(new Set()); },
  });

  const bulkRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      await Promise.all([...selected].map((id) => apiFetch(`/users/${id}`, { method: "PUT", body: JSON.stringify({ globalRole: role }) })));
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
        <p className="text-xs text-on-surface-variant/50">Manage users in your organization.</p>
        <Button onClick={() => setShowInvite(true)}>
          <Plus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/8 border border-primary/20 rounded-xl mb-3 flex-wrap">
          <span className="text-xs font-semibold text-primary">{selected.size} selected</span>
          <div className="flex-1" />
          <Button variant="secondary" onClick={() => bulkDeactivateMutation.mutate()} disabled={bulkDeactivateMutation.isPending}>
            Deactivate
          </Button>
          <div className="relative">
            <Button variant="secondary" onClick={() => setBulkRoleOpen((v) => !v)}>
              Change role <ChevronDown className="w-3 h-3" />
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
          <button onClick={() => setSelected(new Set())} className="p-1 text-on-surface-variant/40 hover:text-on-surface transition-colors" aria-label="Clear selection">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load users.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 w-8">
                  <button onClick={toggleAll} aria-label={allSelected ? "Deselect all" : "Select all"} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
                    {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.map((u) => {
                const isSel = selected.has(u.id);
                return (
                  <tr key={u.id} className={`hover:bg-white/3 transition-colors cursor-pointer ${isSel ? "bg-primary/5" : ""}`} onClick={() => setDetailUser(u)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleOne(u.id)} aria-label={isSel ? "Deselect" : "Select"} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
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
                        {u.globalRole}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${u.status === "active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-white/8 text-on-surface-variant border-white/10"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditUser(u); }} className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteUser(u); }} className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
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
                      <p className="text-sm font-medium text-on-surface">No users yet</p>
                      <button onClick={() => setShowInvite(true)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">Invite first user</button>
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
