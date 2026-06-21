import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Zap, Check, Users, Database } from "lucide-react";

export const Route = createFileRoute("/_auth/billing")({
  component: Billing,
});

const PLANS = [
  {
    name: "Starter",
    price: "$29",
    per: "/mo",
    features: ["Up to 5 agents", "1 mailbox", "Basic SLA", "Email support"],
    current: false,
  },
  {
    name: "Growth",
    price: "$99",
    per: "/mo",
    features: ["Up to 20 agents", "5 mailboxes", "Advanced SLA", "Priority support", "Analytics"],
    current: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    features: ["Unlimited agents", "Unlimited mailboxes", "Custom SLA", "SSO/SAML", "Dedicated support", "SLA guarantee"],
    current: false,
  },
];

function Billing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">Billing & Subscription</h1>
        <p className="text-xs text-on-surface-variant mt-1">Manage your plan and usage.</p>
      </div>

      {/* Current plan summary */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">Current plan</p>
          <p className="text-lg font-bold text-on-surface mt-0.5">Growth</p>
          <p className="text-xs text-on-surface-variant/60">Renews July 1, 2026 · $99/mo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">8</p>
            <p className="text-[10px] text-on-surface-variant/50">of 20 agents</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">3</p>
            <p className="text-[10px] text-on-surface-variant/50">of 5 mailboxes</p>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`bg-surface-container border rounded-xl p-5 flex flex-col gap-4 ${
              plan.current ? "border-primary/40 ring-1 ring-primary/20" : "border-outline-variant"
            }`}
          >
            {plan.current && (
              <span className="self-start text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                Current plan
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-on-surface">{plan.name}</p>
              <div className="flex items-baseline gap-0.5 mt-1">
                <span className="text-2xl font-bold text-on-surface">{plan.price}</span>
                <span className="text-xs text-on-surface-variant">{plan.per}</span>
              </div>
            </div>
            <ul className="space-y-1.5 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled={plan.current}
              className={`w-full py-2 text-xs font-medium rounded-lg transition-colors ${
                plan.current
                  ? "bg-white/5 text-on-surface-variant/40 cursor-not-allowed"
                  : plan.name === "Enterprise"
                  ? "border border-outline-variant text-on-surface-variant hover:bg-white/5"
                  : "bg-primary text-on-primary hover:bg-primary/90"
              }`}
            >
              {plan.current ? "Current plan" : plan.name === "Enterprise" ? "Contact sales" : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Payment method stub */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-on-surface-variant" />
            <h3 className="text-sm font-semibold text-on-surface">Payment method</h3>
          </div>
          <button className="text-xs text-primary hover:text-primary/80 transition-colors">Update</button>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white/3 rounded-lg">
          <div className="w-10 h-6 rounded bg-on-surface-variant/10 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-on-surface-variant/50" />
          </div>
          <div>
            <p className="text-xs font-medium text-on-surface">•••• •••• •••• 4242</p>
            <p className="text-[10px] text-on-surface-variant/40">Expires 12/27</p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-on-surface-variant/30 text-center">Billing integration requires Stripe — UI stubbed</p>
    </div>
  );
}
