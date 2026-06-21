import { ShieldOff, WifiOff, AlertCircle, RefreshCw } from "lucide-react";

type Variant = "forbidden" | "network" | "generic";

interface ErrorStateProps {
  variant?: Variant;
  message?: string;
  onRetry?: () => void;
}

const CONFIG = {
  forbidden: {
    icon: ShieldOff,
    title: "Access denied",
    body: "You don't have permission to view this resource.",
    accent: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  },
  network: {
    icon: WifiOff,
    title: "Connection error",
    body: "Could not reach the server. Check your connection and try again.",
    accent: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  },
  generic: {
    icon: AlertCircle,
    title: "Something went wrong",
    body: "An unexpected error occurred.",
    accent: "bg-error/10 border-error/20 text-error",
  },
};

export function ErrorState({ variant = "generic", message, onRetry }: ErrorStateProps) {
  const { icon: Icon, title, body, accent } = CONFIG[variant];

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${accent}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <p className="text-xs text-on-surface-variant leading-relaxed">{message ?? body}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-white/5 transition-colors group"
        >
          <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300" />
          Try again
        </button>
      )}
    </div>
  );
}

export function isForbiddenError(err: unknown): boolean {
  if (err instanceof Response) return err.status === 403;
  if (typeof err === "object" && err !== null && "status" in err) {
    return (err as any).status === 403;
  }
  const msg = String(err).toLowerCase();
  return msg.includes("403") || msg.includes("forbidden");
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message.includes("fetch")) return true;
  if (err instanceof TypeError && err.message.includes("Failed to fetch")) return true;
  return false;
}

export function getErrorVariant(err: unknown): Variant {
  if (isForbiddenError(err)) return "forbidden";
  if (isNetworkError(err)) return "network";
  return "generic";
}
