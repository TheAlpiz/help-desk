import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, ChevronLeft, ChevronRight, RotateCcw, Search, Filter } from "lucide-react";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";

export const Route = createFileRoute("/_auth/archived")({
  validateSearch: z.object({ page: z.number().optional(), status: z.string().optional() }),
  component: ArchivedTickets,
});

const STATUS_OPTS = [
  { value: "", label: "All archived" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STATUS_CLS: Record<string, string> = {
  resolved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  closed: "bg-white/8 text-on-surface-variant border border-white/10",
};

function getAuthHeaders(): Record<string, string> {
  const state = useAppStore.getState();
  const h: Record<string, string> = {};
  if (state.accessToken) h["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) h["X-Tenant-ID"] = state.tenantId;
  return h;
}

function ArchivedTickets() {
  const { page = 1, status = "" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["archived-tickets", page, status, search],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: "20",
        status: status || "resolved,closed",
      };
      if (search.trim()) params["search"] = search.trim();

      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/tickets?${qs}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await fetch(`/api/tickets/${ticketId}/reopen`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to reopen");
    },
    onSuccess: () => {
      success("Ticket reopened");
      queryClient.invalidateQueries({ queryKey: ["archived-tickets"] });
    },
    onError: () => toastError("Failed to reopen ticket"),
  });

  const paginated = data?.data;
  const tickets: any[] = Array.isArray(paginated) ? paginated : (paginated?.data ?? []);
  const total: number = paginated?.total ?? tickets.length;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-on-surface-variant/50" />
          <h1 className="text-[15px] font-semibold text-on-surface">Archived Tickets</h1>
          {total > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/8 text-on-surface-variant font-mono">
              {total}
            </span>
          )}
        </div>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1 text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Back to tickets
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search archived tickets…"
            className="w-full pl-9 pr-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/35 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            aria-label="Search archived tickets"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-on-surface-variant/40" />
          {STATUS_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => navigate({ search: { page: 1, status: opt.value } })}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                status === opt.value
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-primary/25"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <Archive className="w-10 h-10 text-on-surface-variant/15 mx-auto mb-3" />
            <p className="text-sm text-on-surface-variant/40">No archived tickets</p>
            <p className="text-xs text-on-surface-variant/25 mt-1">
              Resolved and closed tickets will appear here
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider w-28">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider w-32 hidden md:table-cell">Priority</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider w-36 hidden lg:table-cell">Resolved</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {tickets.map((ticket: any) => (
                <tr key={ticket.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to="/tickets/$ticketId"
                      params={{ ticketId: ticket.id }}
                      className="text-sm font-medium text-on-surface hover:text-primary transition-colors truncate block max-w-xs"
                    >
                      {ticket.subject}
                    </Link>
                    {ticket.contactEmail && (
                      <p className="text-[11px] text-on-surface-variant/40 mt-0.5">{ticket.contactEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${STATUS_CLS[ticket.status] ?? "bg-white/8 text-on-surface-variant"}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-on-surface-variant capitalize">{ticket.priority}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-on-surface-variant/50">
                      {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => reopenMutation.mutate(ticket.id)}
                      disabled={reopenMutation.isPending}
                      title="Reopen ticket"
                      aria-label="Reopen ticket"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-outline-variant text-on-surface-variant hover:border-primary/30 hover:text-primary disabled:opacity-40 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reopen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-on-surface-variant/50">
          <span>Page {page} of {totalPages} — {total} tickets</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => navigate({ search: { page: page - 1, status } })}
              aria-label="Previous page"
              className="p-1.5 rounded border border-outline-variant disabled:opacity-30 hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => navigate({ search: { page: page + 1, status } })}
              aria-label="Next page"
              className="p-1.5 rounded border border-outline-variant disabled:opacity-30 hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
