import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AppLogo } from "@/components/AppLogo";
import {
  Ticket,
  Mail,
  MessageSquare,
  Shield,
  Clock,
  Users,
  Bell,
  ChevronRight,
  ArrowRight,
  Check,
  AlertCircle,
  AlertTriangle,
  Minus,
  Zap,
  Lock,
  Globe,
} from "lucide-react";

// ─── Ticket Queue Preview (real component, not a fake div screenshot) ──────────

const PREVIEW_TICKETS = [
  {
    id: "ALP-1247",
    subject: "Cannot access VPN after password reset",
    status: "in_progress",
    priority: "high",
    agent: "LK",
    slaLabel: "2h 14m",
    slaCritical: true,
    dept: "IT Support",
  },
  {
    id: "ALP-1246",
    subject: "New employee hardware provisioning — Q3 batch",
    status: "open",
    priority: "medium",
    agent: null,
    slaLabel: "4h 30m",
    slaCritical: false,
    dept: "IT Support",
  },
  {
    id: "ALP-1245",
    subject: "Office 365 license request for design team",
    status: "waiting_customer",
    priority: "low",
    agent: "MR",
    slaLabel: "1d 2h",
    slaCritical: false,
    dept: "Admin",
  },
  {
    id: "ALP-1244",
    subject: "Slack integration broken on macOS 14.4",
    status: "open",
    priority: "critical",
    agent: "AK",
    slaLabel: "45m",
    slaCritical: true,
    dept: "Software",
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: {
    label: "Open",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
  waiting_customer: {
    label: "Waiting",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  resolved: {
    label: "Resolved",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
};

const PRIORITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  high: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
  medium: <Minus className="w-3.5 h-3.5 text-yellow-400" />,
  low: <Minus className="w-3.5 h-3.5 text-slate-500" />,
};

function TicketQueuePreview() {
  return (
    <div className="w-full max-w-[540px] rounded-xl border border-white/10 bg-[#1a1a1f] overflow-hidden shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#16161a]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-xs text-white/40 font-mono ml-2">
            Ticket Queue
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/30 font-mono">24 open</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertCircle className="w-2.5 h-2.5" />2 SLA breach
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 border-b border-white/6 bg-[#16161a]">
        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
          Subject
        </span>
        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider w-20 text-center">
          Status
        </span>
        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider w-10 text-center">
          SLA
        </span>
        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider w-6" />
      </div>

      {/* Ticket rows */}
      <div className="divide-y divide-white/5">
        {PREVIEW_TICKETS.map((ticket, i) => (
          <div
            key={ticket.id}
            className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-4 py-2.5 transition-colors ${
              i === 3 ? "bg-red-500/5" : "hover:bg-white/3"
            }`}
          >
            {/* Subject + meta */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {PRIORITY_ICON[ticket.priority]}
                <span className="text-[11px] font-mono text-white/30">
                  {ticket.id}
                </span>
              </div>
              <p className="text-[12px] text-white/80 truncate leading-tight">
                {ticket.subject}
              </p>
            </div>

            {/* Status badge */}
            <div className="w-20 flex justify-center">
              <span
                className={`inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_CONFIG[ticket.status]?.color ?? ""}`}
              >
                {STATUS_CONFIG[ticket.status]?.label}
              </span>
            </div>

            {/* SLA */}
            <div className="w-10 text-right">
              <span
                className={`text-[11px] font-mono ${ticket.slaCritical ? "text-red-400" : "text-white/30"}`}
              >
                {ticket.slaLabel}
              </span>
            </div>

            {/* Agent avatar */}
            <div className="w-6 flex justify-end">
              {ticket.agent ? (
                <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[8px] font-bold text-primary">
                  {ticket.agent}
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                  <span className="text-[8px] text-white/20">-</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/6 bg-[#16161a] flex items-center justify-between">
        <span className="text-[11px] text-white/25 font-mono">
          Showing 4 of 24
        </span>
        <div className="flex items-center gap-1 text-[11px] text-primary/70 font-medium">
          View all <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

// ─── Nav ───────────────────────────────────────────────────────────────────────

export function Nav() {
  const { t } = useTranslation("marketing");

  const NAV_LINKS = [
    { label: t("nav.features"), href: "/features" },
    { label: t("nav.pricing"), href: "/pricing" },
    { label: t("nav.docs"), href: "/docs" },
    { label: t("nav.changelog"), href: "/changelog" },
  ];

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 h-14 border-b border-white/8 bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-8">
        <Link to="/">
          <AppLogo className="h-7 w-auto" />
        </Link>
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher variant="inline" className="hidden sm:flex" />
        <Link
          to="/login"
          className="hidden sm:inline-flex px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          {t("nav.signIn")}
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium bg-primary text-on-primary rounded-md hover:bg-primary/90 transition-colors active:scale-[0.98]"
        >
          {t("nav.getStarted")} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const { t } = useTranslation("marketing");
  const badges = t("landing.hero.badges", { returnObjects: true }) as string[];

  return (
    <section className="px-6 md:px-10 pt-16 pb-20 max-w-[1280px] mx-auto">
      <div className="grid md:grid-cols-[1fr_1fr] lg:grid-cols-[5fr_6fr] gap-12 lg:gap-20 items-center">
        {/* Left */}
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-on-surface tracking-tight leading-[1.08]">
            {t("landing.hero.headline1")}{" "}
            <span className="text-primary">{t("landing.hero.headline2")}</span>
          </h1>
          <p className="text-base md:text-lg text-on-surface-variant leading-relaxed max-w-[420px]">
            {t("landing.hero.subtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 font-medium text-sm bg-primary text-on-primary rounded-md hover:bg-primary/90 transition-colors active:scale-[0.98]"
            >
              {t("landing.hero.startFree")} <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-5 py-2.5 font-medium text-sm text-on-surface border border-outline-variant rounded-md hover:bg-surface-container transition-colors"
            >
              {t("landing.hero.howItWorks")}
            </a>
          </div>
          <div className="flex items-center gap-4 pt-2">
            {badges.map((item) => (
              <div
                key={item}
                className="flex items-center gap-1.5 text-xs text-on-surface-variant"
              >
                <Check className="w-3.5 h-3.5 text-secondary" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Right: real ticket queue preview */}
        <div className="flex justify-center md:justify-end">
          <TicketQueuePreview />
        </div>
      </div>
    </section>
  );
}

// ─── Trusted by ────────────────────────────────────────────────────────────────

function TrustedBy() {
  const { t } = useTranslation("marketing");
  const orgs = [
    "Meridian Solutions",
    "Vanta Systems",
    "CoreIT Group",
    "Nexbridge",
    "Arkwell Tech",
    "Quantus MSP",
  ];
  return (
    <section className="border-t border-b border-white/6 py-8 px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
        <p className="text-xs font-medium text-on-surface-variant whitespace-nowrap shrink-0">
          {t("landing.trustedBy")}
        </p>
        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-8 gap-y-3">
          {orgs.map((org) => (
            <span
              key={org}
              className="text-sm font-medium text-on-surface-variant/50 tracking-tight"
            >
              {org}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Bento feature grid ────────────────────────────────────────────────────────

const FEATURE_META = [
  {
    icon: <Ticket className="w-5 h-5" />,
    size: "large",
    accent: "text-primary",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    size: "large",
    accent: "text-tertiary",
  },
  {
    icon: <Mail className="w-5 h-5" />,
    size: "small",
    accent: "text-secondary",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    size: "small",
    accent: "text-secondary",
  },
  {
    icon: <Users className="w-5 h-5" />,
    size: "small",
    accent: "text-primary",
  },
  {
    icon: <Bell className="w-5 h-5" />,
    size: "small",
    accent: "text-tertiary",
  },
];

function FeatureGrid() {
  const { t } = useTranslation("marketing");
  const featureTexts = t("landing.featureGrid.features", {
    returnObjects: true,
  }) as { title: string; body: string }[];

  const features = FEATURE_META.map((meta, i) => ({
    ...meta,
    ...featureTexts[i],
  }));
  const large = features.filter((f) => f.size === "large");
  const small = features.filter((f) => f.size === "small");

  return (
    <section
      id="features"
      className="px-6 md:px-10 py-20 max-w-[1280px] mx-auto"
    >
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          {t("landing.featureGrid.heading1")}
          <br />
          <span className="text-on-surface-variant font-normal">
            {t("landing.featureGrid.heading2")}
          </span>
        </h2>
      </div>

      {/* Large feature cells */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {large.map((feat) => (
          <div
            key={feat.title}
            className="rounded-xl border border-outline-variant bg-surface-container p-8 flex flex-col gap-4 group"
          >
            <div className={`${feat.accent} w-fit p-2 rounded-lg bg-white/5`}>
              {feat.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-on-surface mb-2">
                {feat.title}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {feat.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Small feature cells */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {small.map((feat) => (
          <div
            key={feat.title}
            className="rounded-xl border border-outline-variant bg-surface-container p-6 flex flex-col gap-3"
          >
            <div className={`${feat.accent} w-fit`}>{feat.icon}</div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface mb-1">
                {feat.title}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {feat.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Multi-channel section ────────────────────────────────────────────────────

const CHANNEL_META = [
  { icon: <Mail className="w-4 h-4" />, live: true },
  { icon: <Globe className="w-4 h-4" />, live: true },
  { icon: <MessageSquare className="w-4 h-4" />, live: false },
  { icon: <Zap className="w-4 h-4" />, live: false },
];

function Channels() {
  const { t } = useTranslation("marketing");
  const channelLabels = t("landing.channels.labels", {
    returnObjects: true,
  }) as string[];
  const channels = CHANNEL_META.map((meta, i) => ({
    ...meta,
    label: channelLabels[i],
  }));

  return (
    <section className="px-6 md:px-10 py-20 border-t border-white/6">
      <div className="max-w-[1280px] mx-auto grid md:grid-cols-2 gap-16 items-center">
        {/* Left: channel list */}
        <div className="flex flex-col gap-6">
          <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            {t("landing.channels.heading")}
          </h2>
          <p className="text-base text-on-surface-variant leading-relaxed">
            {t("landing.channels.subtitle")}
          </p>
          <div className="flex flex-col gap-3">
            {channels.map(({ icon, label, live }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <div className="text-on-surface-variant">{icon}</div>
                <span
                  className={
                    live ? "text-on-surface" : "text-on-surface-variant/50"
                  }
                >
                  {label}
                </span>
                {live ? (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    {t("landing.channels.live")}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-on-surface-variant/40 border border-outline-variant/40 px-1.5 py-0.5 rounded">
                    {t("landing.channels.soon")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: email threading visual */}
        <div className="rounded-xl border border-outline-variant bg-surface-container p-6 font-mono text-xs">
          <div className="text-on-surface-variant/50 mb-4">
            Email thread — ALP-1247
          </div>
          {[
            {
              from: "james.h@meridian.com",
              time: "09:12",
              msg: "Still cannot connect to the VPN. Tried restarting twice.",
            },
            {
              from: "support@alpis.io",
              time: "09:31",
              msg: "[Agent — Lena K.] Checking your AD account now. Can you try with the backup credentials?",
            },
            {
              from: "james.h@meridian.com",
              time: "09:44",
              msg: "Same result. Error: 'Certificate not trusted'.",
            },
          ].map((msg, i) => (
            <div
              key={i}
              className={`py-3 ${i > 0 ? "border-t border-white/6" : ""}`}
            >
              <div className="flex justify-between mb-1">
                <span className="text-primary/80 text-[11px]">{msg.from}</span>
                <span className="text-on-surface-variant/40 text-[11px]">
                  {msg.time}
                </span>
              </div>
              <p className="text-on-surface-variant text-[11px] leading-relaxed">
                {msg.msg}
              </p>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-white/6 text-[10px] text-on-surface-variant/30">
            In-Reply-To: &lt;aX84f@meridian.com&gt; · References: RFC 5322
            compliant
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Security section ─────────────────────────────────────────────────────────

function Security() {
  const { t } = useTranslation("marketing");
  const secItems = t("landing.security.items", {
    returnObjects: true,
  }) as string[];
  const headingLines = t("landing.security.heading").split("\n");

  return (
    <section className="px-6 md:px-10 py-20 border-t border-white/6 bg-surface-container-low">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-secondary mb-6 border border-secondary/25 bg-secondary/10 px-3 py-1.5 rounded-full">
              <Lock className="w-3.5 h-3.5" />
              {t("landing.security.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-6">
              {headingLines[0]}
              <br />
              {headingLines[1]}
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed mb-8">
              {t("landing.security.body")}
            </p>
            <div className="flex flex-col gap-3">
              {secItems.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-on-surface-variant"
                >
                  <Check className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Code block */}
          <div className="rounded-xl border border-outline-variant bg-[#16161a] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6 bg-[#131316]">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
              </div>
              <span className="text-[11px] text-white/30 font-mono ml-2">
                infra/db/index.ts
              </span>
            </div>
            <pre className="p-5 text-[11px] font-mono leading-relaxed text-on-surface-variant overflow-x-auto">
              {`export async function withTenantTransaction<T>(
  tenantId: string,
  callback: (tx: Tx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Bind tenant - SET LOCAL scopes to this tx
    await tx.execute(sql\`
      select set_config(
        'app.current_tenant_id',
        \${tenantId}, true
      )
    \`);
    await tx.execute(sql\`
      select set_config('app.bypass_rls', 'off', true)
    \`);
    return callback(tx);
  });
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const PLAN_HIGHLIGHTED = [false, true, false];

function Pricing() {
  const { t } = useTranslation("marketing");
  type PlanData = {
    name: string;
    price: string;
    period: string;
    desc: string;
    cta: string;
    features: string[];
  };
  const plans = (
    t("landing.pricing.plans", { returnObjects: true }) as PlanData[]
  ).map((plan, i) => ({ ...plan, highlighted: PLAN_HIGHLIGHTED[i] }));

  return (
    <section className="px-6 md:px-10 py-20 border-t border-white/6">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-4">
            {t("landing.pricing.heading")}
          </h2>
          <p className="text-base text-on-surface-variant">
            {t("landing.pricing.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col gap-6 ${
                plan.highlighted
                  ? "border-primary/40 bg-primary/5 relative"
                  : "border-outline-variant bg-surface-container"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-primary text-on-primary uppercase tracking-wider">
                    {t("landing.pricing.mostPopular")}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-on-surface-variant mb-2">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-on-surface">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-on-surface-variant">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-2">
                  {plan.desc}
                </p>
              </div>

              <Link
                to="/register"
                className={`inline-flex justify-center items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-on-primary hover:bg-primary/90"
                    : "bg-surface-container-high text-on-surface hover:bg-surface-bright"
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="flex flex-col gap-2">
                {plan.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-2 text-xs text-on-surface-variant"
                  >
                    <Check className="w-3.5 h-3.5 text-secondary shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCta() {
  const { t } = useTranslation("marketing");
  return (
    <section className="px-6 md:px-10 py-24 border-t border-white/6 text-center">
      <div className="max-w-2xl mx-auto flex flex-col gap-6 items-center">
        <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          {t("landing.cta.heading")}
        </h2>
        <p className="text-base text-on-surface-variant">
          {t("landing.cta.subtitle")}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 font-medium text-sm bg-primary text-on-primary rounded-md hover:bg-primary/90 transition-colors active:scale-[0.98]"
          >
            {t("landing.cta.startFree")} <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="mailto:sales@alpis.io"
            className="inline-flex items-center gap-2 px-6 py-3 font-medium text-sm text-on-surface border border-outline-variant rounded-md hover:bg-surface-container transition-colors"
          >
            {t("landing.cta.talkToSales")}
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  const { t } = useTranslation("marketing");
  type FooterLink = { label: string; href: string };
  const links = t("footer.links", { returnObjects: true }) as FooterLink[];

  return (
    <footer className="border-t border-white/6 px-6 md:px-10 py-10">
      <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row justify-between gap-6">
        <div className="flex items-center gap-3">
          <AppLogo className="h-7 w-auto" />
          <span className="text-xs text-on-surface-variant">
            {t("footer.tagline")}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-on-surface-variant">
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-on-surface transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased">
      <Nav />
      <Hero />
      <TrustedBy />
      <FeatureGrid />
      <Channels />
      <Security />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  );
}
