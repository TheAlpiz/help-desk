import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Plus, X, Pencil, Trash2, Building2, Users } from "lucide-react";
import { useAppStore } from "@/store";
import { createDepartmentSchema, updateDepartmentSchema } from "@help-desk/shared";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";

type Department = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

function getAuthHeaders() {
  const state = useAppStore.getState();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (state.accessToken) headers["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) headers["X-Tenant-ID"] = state.tenantId;
  return headers;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init.headers ?? {}) },
  });
  const body = await res.json();
  return { res, body };
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeptFormBody({ form, error, onClose, submitLabel }: {
  form: any;
  error: string | null;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}
      className="p-5 space-y-4"
    >
      <FormAlert>{error ?? undefined}</FormAlert>

      <form.Field
        name="name"
        validators={{ onChange: z.string().min(1, "Name is required") }}
        children={(field: any) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Name *</label>
            <Input
              dense
              autoFocus
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e: any) => field.handleChange(e.target.value)}
              placeholder="e.g. Support"
            />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )}
      />

      <form.Field
        name="description"
        children={(field: any) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Description</label>
            <textarea
              className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-colors resize-none"
              rows={3}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e: any) => field.handleChange(e.target.value)}
              placeholder="Describe this department..."
            />
          </div>
        )}
      />

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <form.Subscribe
          selector={(s: any) => [s.canSubmit, s.isSubmitting]}
          children={([canSubmit, isSubmitting]: [boolean, boolean]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && submitLabel}
            </Button>
          )}
        />
      </div>
    </form>
  );
}

function CreateDepartmentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: "", description: "" },
    validators: { onChange: createDepartmentSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const { res, body } = await apiFetch("/departments", { method: "POST", body: JSON.stringify(value) });
        if (!res.ok) { setError(body?.error?.message || body?.message || "Failed to create department"); return; }
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        onClose();
      } catch (err: any) { setError(err.message || "An error occurred"); }
    },
  });

  return (
    <ModalShell title="New Department" onClose={onClose}>
      <DeptFormBody form={form} error={error} onClose={onClose} submitLabel="Create" />
    </ModalShell>
  );
}

function EditDepartmentModal({ dept, onClose }: { dept: Department; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: dept.name, description: dept.description ?? "" },
    validators: { onChange: updateDepartmentSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const { res, body } = await apiFetch(`/departments/${dept.id}`, { method: "PUT", body: JSON.stringify(value) });
        if (!res.ok) { setError(body?.error?.message || body?.message || "Failed to update department"); return; }
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        onClose();
      } catch (err: any) { setError(err.message || "An error occurred"); }
    },
  });

  return (
    <ModalShell title="Edit Department" onClose={onClose}>
      <DeptFormBody form={form} error={error} onClose={onClose} submitLabel="Save Changes" />
    </ModalShell>
  );
}

function DeleteDepartmentConfirm({ dept, onClose }: { dept: Department; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { res, body } = await apiFetch(`/departments/${dept.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed to delete");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); onClose(); },
  });

  return (
    <ModalShell title="Delete Department" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-on-surface-variant">
          Delete <span className="font-semibold text-on-surface">{dept.name}</span>? Cannot be undone.
        </p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && "Delete"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeptMembersDrawer({ dept, onClose }: { dept: Department; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["dept-members", dept.id],
    queryFn: async () => {
      const { body } = await apiFetch(`/departments/${dept.id}/members`);
      return body ?? { data: [] };
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { body } = await apiFetch("/users");
      return body ?? { data: [] };
    },
  });

  const members: any[] = (membersData as any)?.data ?? [];
  const allUsers: any[] = (usersData as any)?.data ?? [];
  const memberIds = new Set(members.map((m: any) => m.id));
  const available = allUsers.filter((u: any) => !memberIds.has(u.id));

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      const { res } = await apiFetch(`/departments/${dept.id}/members`, { method: "POST", body: JSON.stringify({ userId }) });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dept-members", dept.id] }),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { res } = await apiFetch(`/departments/${dept.id}/members/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dept-members", dept.id] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog" aria-label={`${dept.name} members`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-container border-l border-outline-variant flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">{dept.name}</h3>
            <p className="text-[11px] text-on-surface-variant/50">Members ({members.length})</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-variant/40 hover:text-on-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
          ) : (
            <>
              {members.length === 0 ? (
                <p className="text-xs text-on-surface-variant/40 text-center py-4">No members yet</p>
              ) : (
                <div className="space-y-1">
                  {members.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2 bg-white/3 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {m.firstName?.[0]}{m.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-on-surface">{m.firstName} {m.lastName}</p>
                        <p className="text-[10px] text-on-surface-variant/50">{m.email}</p>
                      </div>
                      <button
                        onClick={() => removeMember.mutate(m.id)}
                        disabled={removeMember.isPending}
                        className="text-on-surface-variant/30 hover:text-error transition-colors"
                        aria-label={`Remove ${m.firstName}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {available.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider mb-2">Add member</p>
                  <div className="space-y-1">
                    {available.map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => addMember.mutate(u.id)}
                        disabled={addMember.isPending}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 hover:border-primary/20 border border-transparent text-left transition-colors disabled:opacity-40"
                      >
                        <div className="w-6 h-6 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-[9px] text-on-surface-variant shrink-0">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-on-surface-variant">{u.firstName} {u.lastName}</p>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-primary/60" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DepartmentsTable() {
  const [showCreate, setShowCreate] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);
  const [membersDrawer, setMembersDrawer] = useState<Department | null>(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { body } = await apiFetch("/departments");
      return body as { data: Department[] };
    },
  });

  const departments: Department[] = response?.data ?? [];

  return (
    <>
      {showCreate && <CreateDepartmentModal onClose={() => setShowCreate(false)} />}
      {editDept && <EditDepartmentModal dept={editDept} onClose={() => setEditDept(null)} />}
      {deleteDept && <DeleteDepartmentConfirm dept={deleteDept} onClose={() => setDeleteDept(null)} />}
      {membersDrawer && <DeptMembersDrawer dept={membersDrawer} onClose={() => setMembersDrawer(null)} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant/50">Manage your organization's departments.</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Department
        </Button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load departments.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-on-surface">{dept.name}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60">{dept.description || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setMembersDrawer(dept)}
                        className="p-1.5 rounded text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Manage members"
                        aria-label="Manage members"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditDept(dept)}
                        className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteDept(dept)}
                        className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-on-surface">No departments yet</p>
                      <button
                        onClick={() => setShowCreate(true)}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Create first department
                      </button>
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
