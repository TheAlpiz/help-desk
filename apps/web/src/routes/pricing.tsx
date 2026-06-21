import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";
import { Check, X, HelpCircle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const FAQS = [
  {
    q: "Do I need a credit card to sign up?",
    a: "No! You can sign up and use our Starter plan entirely for free without entering any payment information. You only need a card if you decide to upgrade to Pro."
  },
  {
    q: "How does the 'per 5 agents' pricing work?",
    a: "Our Pro plan is billed in blocks of 5 agents. If you have 1-5 agents, it's $49/mo. For 6-10 agents, it's $98/mo. This simplifies billing and avoids micromanaging licenses."
  },
  {
    q: "Can I self-host Alpis?",
    a: "Yes, self-hosting is available on our Enterprise plan. We provide Docker images and Helm charts for deployment on your own infrastructure. Contact sales for details."
  },
  {
    q: "What constitutes a 'mailbox'?",
    a: "A mailbox is an email address you connect via IMAP/SMTP (e.g., support@yourcompany.com). The Starter plan includes 1 mailbox, Pro includes 10."
  }
];

function PricingPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      <main className="flex-grow">
        {/* Header */}
        <section className="relative px-6 md:px-10 pt-24 pb-20 max-w-[1280px] mx-auto text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-secondary/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
              Pricing that scales with you
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed">
              Start for free, upgrade when you need advanced features. No hidden fees, no per-ticket overages.
            </p>
          </div>
        </section>
        
        {/* Pricing Cards */}
        <section className="px-6 md:px-10 pb-24 max-w-[1280px] mx-auto relative z-10">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            
            {/* Starter */}
            <div className="rounded-2xl border border-white/10 bg-surface-container/50 backdrop-blur-sm p-8 flex flex-col h-full hover:border-white/20 transition-colors">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-on-surface mb-2">Starter</h3>
                <p className="text-sm text-on-surface-variant">Perfect for small teams and startups.</p>
              </div>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">$0</span>
                <span className="text-on-surface-variant font-medium">/ forever</span>
              </div>
              <Link to="/register" className="w-full text-center px-6 py-3 bg-surface-container-high hover:bg-surface-bright rounded-xl font-semibold transition-all mb-8">
                Get Started
              </Link>
              <div className="space-y-4 flex-grow">
                <p className="text-sm font-semibold text-on-surface">Includes:</p>
                <ul className="space-y-3">
                  {["Up to 3 agents", "1 connected mailbox", "500 tickets/month", "Standard support", "Community forum access"].map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-on-surface-variant">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Pro */}
            <div className="rounded-2xl border border-primary bg-surface-container/80 backdrop-blur-md p-8 flex flex-col h-[105%] relative shadow-[0_0_40px_rgba(var(--color-primary),0.15)] z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">Pro</h3>
                <p className="text-sm text-on-surface-variant">For growing IT teams needing automation.</p>
              </div>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">$49</span>
                <span className="text-on-surface-variant font-medium">/ mo per 5 agents</span>
              </div>
              <Link to="/register" className="w-full text-center px-6 py-3 bg-primary text-on-primary hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)] rounded-xl font-semibold transition-all active:scale-95 mb-8">
                Start 14-day free trial
              </Link>
              <div className="space-y-4 flex-grow">
                <p className="text-sm font-semibold text-on-surface">Everything in Starter, plus:</p>
                <ul className="space-y-3">
                  {["Unlimited tickets", "10 connected mailboxes", "SLA management rules", "Automated workflows", "Role-based access control", "Priority email support"].map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-on-surface-variant">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Enterprise */}
            <div className="rounded-2xl border border-white/10 bg-surface-container/50 backdrop-blur-sm p-8 flex flex-col h-full hover:border-white/20 transition-colors">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-on-surface mb-2">Enterprise</h3>
                <p className="text-sm text-on-surface-variant">Advanced security and compliance.</p>
              </div>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">Custom</span>
              </div>
              <a href="mailto:sales@alpis.io" className="w-full text-center px-6 py-3 border border-white/20 hover:bg-white/5 rounded-xl font-semibold transition-all mb-8">
                Contact Sales
              </a>
              <div className="space-y-4 flex-grow">
                <p className="text-sm font-semibold text-on-surface">Everything in Pro, plus:</p>
                <ul className="space-y-3">
                  {["Self-hosted deployment", "SAML SSO / SCIM", "Unlimited mailboxes", "Custom integration support", "Dedicated success manager", "99.99% uptime SLA"].map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-on-surface-variant">
                      <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </section>

        {/* Comparison Table */}
        <section className="px-6 md:px-10 py-20 bg-surface-container-low border-y border-white/5">
          <div className="max-w-[1000px] mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Compare Plans</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 font-semibold text-on-surface w-1/3">Feature</th>
                    <th className="py-4 font-semibold text-center w-2/9">Starter</th>
                    <th className="py-4 font-semibold text-center text-primary w-2/9">Pro</th>
                    <th className="py-4 font-semibold text-center w-2/9">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {[
                    { label: "Agents included", s: "3", p: "5 (base)", e: "Custom" },
                    { label: "Monthly tickets", s: "500", p: "Unlimited", e: "Unlimited" },
                    { label: "Mailboxes", s: "1", p: "10", e: "Unlimited" },
                    { label: "SLA Management", s: false, p: true, e: true },
                    { label: "Automations", s: false, p: true, e: true },
                    { label: "Custom Domains", s: false, p: true, e: true },
                    { label: "RBAC & ABAC", s: false, p: true, e: true },
                    { label: "SSO (SAML)", s: false, p: false, e: true },
                    { label: "Self-hosting", s: false, p: false, e: true },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 text-on-surface-variant">{row.label}</td>
                      <td className="py-4 text-center">
                        {typeof row.s === 'boolean' ? (row.s ? <Check className="w-4 h-4 mx-auto text-emerald-400" /> : <X className="w-4 h-4 mx-auto text-white/20" />) : row.s}
                      </td>
                      <td className="py-4 text-center font-medium">
                        {typeof row.p === 'boolean' ? (row.p ? <Check className="w-4 h-4 mx-auto text-primary" /> : <X className="w-4 h-4 mx-auto text-white/20" />) : row.p}
                      </td>
                      <td className="py-4 text-center">
                        {typeof row.e === 'boolean' ? (row.e ? <Check className="w-4 h-4 mx-auto text-white" /> : <X className="w-4 h-4 mx-auto text-white/20" />) : row.e}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="px-6 md:px-10 py-24 max-w-[800px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-on-surface-variant">Still have questions? <Link to="/contact" className="text-primary hover:underline">Contact our team.</Link></p>
          </div>
          <div className="space-y-6">
            {FAQS.map((faq, i) => (
              <div key={i} className="p-6 rounded-2xl bg-surface-container border border-white/5">
                <h4 className="flex items-start gap-3 font-semibold text-lg mb-3">
                  <HelpCircle className="w-6 h-6 text-primary shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-on-surface-variant leading-relaxed pl-9">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
