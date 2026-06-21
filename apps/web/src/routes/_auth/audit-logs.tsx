import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { ErrorState, getErrorVariant } from "@/components/ErrorState";

export const Route = createFileRoute("/_auth/audit-logs")({
  component: AuditLogs,
});

const PAGE_SIZE = 30;

function AuditLogs() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["audit-logs", page, search, action],
    queryFn: async () => {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      };
      if (search) params.search = search;
      if (action) params.action = action;
      const res = await api.auditLogs.index.$get({ query: params as any });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const raw = (data as any)?.data ?? {};
  const logs: any[] = Array.isArray(raw) ? raw : raw.data ?? raw;
  const total: number = raw.total ?? logs.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-on-surface-variant" />
          <h1 className="text-[15px] font-semibold text-on-surface">Audit Log</h1>
          {total > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/8 text-on-surface-variant border border-white/10">
              {total.toLocaleString()} events
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/40 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search actor, entity..."
              className="pl-8 pr-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 w-52 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <input
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(0); }}
            placeholder="Filter by action..."
            className="px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 w-40 transition-colors"
          />
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <ErrorState variant={getErrorVariant(error)} onRetry={refetch} />
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <Shield className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-on-surface">No audit events</p>
            <p className="text-xs text-on-surface-variant/40 mt-1">
              {search || action ? "No events match your filter" : "System events will appear here"}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-left">
              <thead className="border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Actor</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Entity</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden lg:table-cell">Entity ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-mono text-on-surface-variant/50 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface font-mono">
                      {log.actorId?.slice(0, 8) ?? "system"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      {log.entityType}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-on-surface-variant/40 hidden lg:table-cell">
                      {log.entityId?.slice(0, 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
                <span className="text-xs text-on-surface-variant/60">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:bg-white/5 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:bg-white/5 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
