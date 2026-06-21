import { LucideIcon, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  icon: LucideIcon;
  label: string;
  description: string;
}

interface ComingSoonProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  description: string;
  features?: Feature[];
  eta?: string;
  badge?: string;
}

export function ComingSoon({
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10 border-primary/20",
  title,
  description,
  features = [],
  eta,
  badge,
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Ambient glow */}
      <div className="relative mb-8">
        <div
          className={cn(
            "absolute inset-0 rounded-3xl blur-2xl opacity-20 scale-150",
            iconBg,
          )}
        />
        <div
          className={cn(
            "relative w-20 h-20 rounded-3xl border-2 flex items-center justify-center",
            iconBg,
          )}
        >
          <Icon className={cn("w-9 h-9", iconColor)} />
        </div>

        {/* Badge */}
        <div className="absolute -top-2 -right-3 flex items-center gap-1 px-2 py-0.5 bg-surface-container-high border border-outline-variant rounded-full shadow-lg">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            {badge ?? "Coming soon"}
          </span>
        </div>
      </div>

      {/* Headline */}
      <h2 className="text-xl font-bold text-on-surface mb-3 text-center">{title}</h2>
      <p className="text-sm text-on-surface-variant max-w-md text-center leading-relaxed mb-8">
        {description}
      </p>

      {/* Feature grid */}
      {features.length > 0 && (
        <div className="w-full max-w-md mb-8">
          <p className="text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-widest text-center mb-4">
            What's included
          </p>
          <div className="grid grid-cols-1 gap-2">
            {features.map(({ icon: FIcon, label, description: fdesc }) => (
              <div
                key={label}
                className="flex items-start gap-3 px-4 py-3 bg-surface-container border border-outline-variant rounded-xl group hover:border-outline transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-white/8 transition-colors">
                  <FIcon className="w-3.5 h-3.5 text-on-surface-variant/60" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface">{label}</p>
                  <p className="text-[11px] text-on-surface-variant/60 mt-0.5 leading-relaxed">
                    {fdesc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ETA */}
      {eta && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl">
          <Clock className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0" />
          <span className="text-xs text-on-surface-variant/60">
            Estimated: <span className="font-semibold text-on-surface/80">{eta}</span>
          </span>
        </div>
      )}
    </div>
  );
}
