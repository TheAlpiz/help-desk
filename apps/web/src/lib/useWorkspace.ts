import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import { api } from "@/lib/api";

export type WorkspaceDepartment = { id: string; name: string };

/**
 * Departments the current user belongs to — powers the workspace switcher menu.
 * Cached for the session; refetched lazily.
 */
export function useMyDepartments() {
  const enabled = !!useAppStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["my-departments"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<WorkspaceDepartment[]> => {
      const res = await api.users.me.departments.$get();
      if (!res.ok) return [];
      const body = (await res.json()) as any;
      return (body?.data ?? []).map((d: any) => ({ id: d.id, name: d.name }));
    },
  });
}

/**
 * Current workspace selection plus the query params + cache-key fragment that
 * tickets/tasks lists must thread through so the backend scope guard applies.
 *   personal           → { scope: "personal" }   (own rows only)
 *   corporate + dept    → { scope: "dept:<id>" }  (one department)
 *   corporate + all     → {}                       (org-wide, ABAC still applies)
 */
export function useWorkspaceScope() {
  const mode = useAppStore((s) => s.workspaceMode);
  const deptId = useAppStore((s) => s.workspaceDeptId);

  let scope: string | undefined;
  if (mode === "personal") scope = "personal";
  else if (deptId) scope = `dept:${deptId}`;

  const params: Record<string, string> = scope ? { scope } : {};
  return { mode, deptId, scope, params, key: scope ?? "all" };
}
