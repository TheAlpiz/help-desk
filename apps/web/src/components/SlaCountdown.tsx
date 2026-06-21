import { useEffect, useState } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface SlaCountdownProps {
  targetAt: string | null;
  met: boolean | null;
  label?: string;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function SlaCountdown({ targetAt, met, label = "SLA" }: SlaCountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (met || !targetAt) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [met, targetAt]);

  if (met === true) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400">
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-medium">{label} met</span>
      </div>
    );
  }

  if (!targetAt) {
    return <span className="text-xs text-on-surface-variant/30">No SLA</span>;
  }

  const target = new Date(targetAt).getTime();
  const remaining = target - now;
  const isBreached = remaining <= 0;
  const isWarning = !isBreached && remaining < 60 * 60 * 1000; // < 1h

  return (
    <div
      className={`flex items-center gap-1.5 ${
        isBreached ? "text-red-400" : isWarning ? "text-amber-400" : "text-on-surface-variant"
      }`}
    >
      {isBreached ? (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="text-xs font-medium font-mono">
        {isBreached ? `Breached ${formatDuration(Math.abs(remaining))} ago` : formatDuration(remaining)}
      </span>
    </div>
  );
}
