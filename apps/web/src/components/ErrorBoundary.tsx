import { Component } from "react";
import type { ErrorInfo } from "react";
import { AlertTriangle, ShieldOff, Lock, WifiOff, Home, ArrowLeft, RefreshCw, ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";

// ─── Error classification ─────────────────────────────────────────────────────

type ErrorKind = "auth" | "forbidden" | "not-found" | "network" | "unknown";

function classifyError(err: unknown): { kind: ErrorKind; status?: number; message: string } {
  const status =
    (err as any)?.status ??
    (err as any)?.response?.status ??
    (err as any)?.statusCode;

  const message =
    (err as any)?.message ??
    (typeof err === "string" ? err : "An unexpected error occurred");

  if (status === 401) return { kind: "auth", status, message };
  if (status === 403) return { kind: "forbidden", status, message };
  if (status === 404) return { kind: "not-found", status, message };
  if (
    err instanceof TypeError &&
    (message.includes("fetch") || message.includes("network") || message.includes("Failed to fetch"))
  )
    return { kind: "network", message };

  return { kind: "unknown", status, message };
}

// ─── UI ───────────────────────────────────────────────────────────────────────

interface ErrorPageProps {
  error: unknown;
  reset?: () => void;
  /** Hide the full-screen wrapper (use when embedded inside a layout) */
  inline?: boolean;
}

const KIND_CONFIG = {
  auth: {
    icon: Lock,
    accent: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    title: "Session expired",
    body: "Your session has expired. Please sign in again to continue.",
    primaryLabel: "Sign in",
    primaryHref: "/login" as string | null,
  },
  forbidden: {
    icon: ShieldOff,
    accent: "bg-error/10 border-error/20 text-error",
    title: "Access denied",
    body: "You don't have permission to access this resource.",
    primaryLabel: "Go home",
    primaryHref: "/" as string | null,
  },
  "not-found": {
    icon: AlertTriangle,
    accent: "bg-primary/10 border-primary/20 text-primary",
    title: "Not found",
    body: "The resource you requested could not be found.",
    primaryLabel: "Go home",
    primaryHref: "/" as string | null,
  },
  network: {
    icon: WifiOff,
    accent: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    title: "Connection error",
    body: "Could not reach the server. Check your internet connection and try again.",
    primaryLabel: null,
    primaryHref: null,
  },
  unknown: {
    icon: AlertTriangle,
    accent: "bg-error/10 border-error/20 text-error",
    title: "Something went wrong",
    body: "An unexpected error occurred. You can try again or go back.",
    primaryLabel: null,
    primaryHref: null,
  },
};

export function ErrorPage({ error, reset, inline = false }: ErrorPageProps) {
  const { kind, status, message } = classifyError(error);
  const cfg = KIND_CONFIG[kind];
  const Icon = cfg.icon;
  const isDev = import.meta.env.DEV;
  const stack = (error as any)?.stack as string | undefined;

  const inner = (
    <div className="flex flex-col items-center gap-6 text-center max-w-md w-full">
      {/* Icon */}
      <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${cfg.accent}`}>
        <Icon className="w-7 h-7" />
      </div>

      {/* Status + title */}
      <div className="space-y-2">
        {status && (
          <span className="inline-block px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full bg-white/5 border border-outline-variant text-on-surface-variant/60">
            HTTP {status}
          </span>
        )}
        <h1 className="text-xl font-bold text-on-surface tracking-tight">{cfg.title}</h1>
        <p className="text-sm text-on-surface-variant leading-relaxed">{cfg.body}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-center">
        {cfg.primaryHref && cfg.primaryLabel && (
          <Link
            to={cfg.primaryHref}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            {cfg.primaryLabel}
          </Link>
        )}
        {reset && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-white/5 transition-colors group"
          >
            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
            Try again
          </button>
        )}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Go back
        </button>
      </div>

      {/* Dev-only error details */}
      {isDev && (
        <details className="w-full text-left group">
          <summary className="flex items-center gap-1.5 text-xs text-on-surface-variant/50 cursor-pointer select-none hover:text-on-surface-variant transition-colors list-none">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            Error details (dev only)
          </summary>
          <div className="mt-3 p-3 bg-black/40 border border-outline-variant/50 rounded-lg overflow-auto max-h-48">
            <p className="text-xs font-mono text-error break-words">{message}</p>
            {stack && (
              <pre className="mt-2 text-[10px] font-mono text-on-surface-variant/40 whitespace-pre-wrap break-words">
                {stack.split("\n").slice(1).join("\n")}
              </pre>
            )}
          </div>
        </details>
      )}
    </div>
  );

  if (inline) return inner;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-error/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>
      <div className="relative">{inner}</div>
    </div>
  );
}

// ─── TanStack Router errorComponent adapter ───────────────────────────────────

interface RouterErrorProps {
  error: Error;
  reset: () => void;
}

export function RouterErrorBoundary({ error, reset }: RouterErrorProps) {
  return <ErrorPage error={error} reset={reset} />;
}

// ─── Class-based React Error Boundary ────────────────────────────────────────

interface EBProps {
  children: React.ReactNode;
  /** Render inline (no full-screen wrapper) */
  inline?: boolean;
}

interface EBState {
  error: unknown | null;
}

export class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): EBState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error !== null) {
      return (
        <ErrorPage
          error={this.state.error}
          reset={this.reset}
          inline={this.props.inline}
        />
      );
    }
    return this.props.children;
  }
}
