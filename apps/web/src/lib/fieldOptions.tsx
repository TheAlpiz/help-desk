import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useAppStore } from "@/store";

export type FieldOption = { value: string; label: string };

// Fixed enums — mirror backend ticket status/priority domains (see CLAUDE.md)
export const STATUS_OPTIONS: FieldOption[] = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_customer", label: "Waiting Customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "reopened", label: "Reopened" },
];

export const PRIORITY_OPTIONS: FieldOption[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function authHeaders() {
  const { accessToken, tenantId } = useAppStore.getState();
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-Tenant-ID": tenantId ?? "",
  };
}

// Live directory values pulled from the DB. React Query dedupes by key, so this
// hook can be called from every row without extra network cost.
export function useDirectoryOptions() {
  const { data: agents = [] } = useQuery({
    queryKey: ["directory", "agents"],
    staleTime: 60_000,
    queryFn: async (): Promise<FieldOption[]> => {
      const res = await fetch("/api/users", { headers: authHeaders() });
      const json = await res.json().catch(() => ({}));
      return ((json?.data ?? []) as any[]).map((u) => ({
        value: u.email,
        label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
      }));
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["directory", "departments"],
    staleTime: 60_000,
    queryFn: async (): Promise<FieldOption[]> => {
      const res = await fetch("/api/departments", { headers: authHeaders() });
      const json = await res.json().catch(() => ({}));
      return ((json?.data ?? []) as any[]).map((d) => ({ value: d.name, label: d.name }));
    },
  });

  return { agents, departments };
}

// Maps a condition field or action type to its option source.
// Returns null for keys with no DB source (tags, free-text, notes) → text input.
export function optionsForKey(
  key: string,
  dir: { agents: FieldOption[]; departments: FieldOption[] },
): FieldOption[] | null {
  switch (key) {
    case "status":
    case "set_status":
      return STATUS_OPTIONS;
    case "priority":
    case "set_priority":
      return PRIORITY_OPTIONS;
    case "assignee":
    case "assign_to":
      return dir.agents;
    case "department":
    case "set_department":
      return dir.departments;
    default:
      return null;
  }
}

export function FieldValueInput({
  optionKey,
  value,
  onChange,
  onKeyDown,
  inputClassName,
  selectClassName,
  wrapperClassName = "relative",
  placeholder = "value",
  ariaLabel,
}: {
  optionKey: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputClassName?: string;
  selectClassName?: string;
  wrapperClassName?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const dir = useDirectoryOptions();
  const options = optionsForKey(optionKey, dir);

  if (!options) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <div className={wrapperClassName}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
        aria-label={ariaLabel}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
    </div>
  );
}
