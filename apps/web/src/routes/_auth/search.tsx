import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { Search, Ticket, CheckSquare, Users, Building2, FileText, X } from "lucide-react";
import { useAppStore } from "@/store";
import { authFetch } from "@/lib/api";

export const Route = createFileRoute("/_auth/search")({
  validateSearch: z.object({ q: z.string().optional() }),
  component: GlobalSearch,
});

type EntityType = "ticket" | "task" | "user" | "department" | "audit";

interface SearchResult {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
}

const ENTITY_ICON: Record<EntityType, React.ReactNode> = {
  ticket: <Ticket className="w-3.5 h-3.5" />,
  task: <CheckSquare className="w-3.5 h-3.5" />,
  user: <Users className="w-3.5 h-3.5" />,
  department: <Building2 className="w-3.5 h-3.5" />,
  audit: <FileText className="w-3.5 h-3.5" />,
};

const ENTITY_COLOR: Record<EntityType, string> = {
  ticket: "text-blue-400 bg-blue-400/10",
  task: "text-emerald-400 bg-emerald-400/10",
  user: "text-violet-400 bg-violet-400/10",
  department: "text-amber-400 bg-amber-400/10",
  audit: "text-slate-400 bg-slate-400/10",
};

const ENTITY_LABEL: Record<EntityType, string> = {
  ticket: "Ticket",
  task: "Task",
  user: "User",
  department: "Department",
  audit: "Audit log",
};

function getAuthHeaders(): Record<string, string> {
  const state = useAppStore.getState();
  const h: Record<string, string> = {};
  if (state.accessToken) h["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) h["X-Tenant-ID"] = state.tenantId;
  return h;
}

async function searchEntity(
  endpoint: string,
  q: string,
  mapper: (item: any) => SearchResult,
): Promise<SearchResult[]> {
  try {
    const res = await authFetch(`${endpoint}?search=${encodeURIComponent(q)}&limit=5`);
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = data?.data?.items ?? data?.data ?? [];
    return items.map(mapper);
  } catch {
    return [];
  }
}

async function runSearch(q: string): Promise<SearchResult[]> {
  const [tickets, tasks, users, departments] = await Promise.all([
    searchEntity("/api/tickets", q, (t) => ({
      id: t.id,
      type: "ticket" as const,
      title: t.subject ?? t.id,
      subtitle: t.contactEmail,
      href: `/tickets/${t.id}`,
      meta: t.status,
    })),
    searchEntity("/api/tasks", q, (t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: t.description,
      href: "/tasks",
      meta: t.status,
    })),
    searchEntity("/api/users", q, (u) => ({
      id: u.id,
      type: "user" as const,
      title: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
      subtitle: u.email,
      href: "/users",
      meta: u.globalRole,
    })),
    searchEntity("/api/departments", q, (d) => ({
      id: d.id,
      type: "department" as const,
      title: d.name,
      subtitle: d.description,
      href: "/departments",
    })),
  ]);

  return [...tickets, ...tasks, ...users, ...departments];
}

function ResultCard({ result }: { result: SearchResult }) {
  return (
    <Link
      to={result.href as any}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${ENTITY_COLOR[result.type]}`}>
        {ENTITY_ICON[result.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors truncate">
            {result.title}
          </span>
          {result.meta && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-on-surface-variant shrink-0 font-mono">
              {result.meta}
            </span>
          )}
        </div>
        {result.subtitle && (
          <p className="text-xs text-on-surface-variant/60 truncate mt-0.5">{result.subtitle}</p>
        )}
      </div>
      <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded mt-0.5 ${ENTITY_COLOR[result.type]}`}>
        {ENTITY_LABEL[result.type]}
      </span>
    </Link>
  );
}

function GlobalSearch() {
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState<EntityType | "all">("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(false);
    runSearch(q).then((r) => {
      setResults(r);
      setLoading(false);
      setSearched(true);
    });
  }, [q]);

  const handleInput = (value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ to: "/search", search: { q: value } });
    }, 400);
  };

  const clearSearch = () => {
    setInput("");
    setResults([]);
    setSearched(false);
    navigate({ to: "/search", search: {} });
  };

  const filtered = filter === "all" ? results : results.filter((r) => r.type === filter);

  const byType = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">Global Search</h1>
        <p className="text-xs text-on-surface-variant mt-1">Search across tickets, tasks, users, and departments.</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
        <input
          autoFocus
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Search everything…"
          className="w-full pl-10 pr-9 py-3 bg-surface-container border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/35 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-colors"
          aria-label="Global search"
        />
        {input && (
          <button
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      {results.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${filter === "all" ? "bg-primary/15 border-primary/30 text-primary" : "border-outline-variant text-on-surface-variant hover:border-primary/30"}`}
          >
            All ({results.length})
          </button>
          {(Object.keys(byType) as EntityType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${filter === type ? `${ENTITY_COLOR[type]} border-current` : "border-outline-variant text-on-surface-variant hover:border-primary/30"}`}
            >
              {ENTITY_ICON[type]}
              {ENTITY_LABEL[type]}s ({byType[type]})
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && searched && filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant/40">No results for "{q}"</p>
          <p className="text-xs text-on-surface-variant/25 mt-1">Try different keywords or check spelling</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-xl divide-y divide-outline-variant/30 overflow-hidden">
          {filtered.map((r) => (
            <ResultCard key={`${r.type}-${r.id}`} result={r} />
          ))}
        </div>
      )}

      {!loading && !searched && !q && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-on-surface-variant/15 mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant/35">Start typing to search</p>
          <p className="text-xs text-on-surface-variant/20 mt-1">Searches tickets, tasks, users, and departments</p>
        </div>
      )}
    </div>
  );
}
