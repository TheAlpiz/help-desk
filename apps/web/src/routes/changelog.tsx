import { createFileRoute } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";
import { Sparkles, Bug, Zap } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  component: ChangelogPage,
});

const RELEASES = [
  {
    version: "v1.2.0",
    date: "June 20, 2026",
    title: "Advanced SLAs and Custom Business Hours",
    description: "This release focuses on giving enterprise teams more control over their Service Level Agreements. You can now define custom business hours per department and set multi-tier escalation policies.",
    changes: [
      { type: "feature", text: "Added support for custom business hours in SLA policies." },
      { type: "feature", text: "Introduced multi-tier escalation rules for SLA breaches." },
      { type: "improvement", text: "Optimized ticket list rendering for queues with >10,000 active tickets." },
      { type: "bug", text: "Fixed a bug with email thread reply parsing on Outlook clients." }
    ]
  },
  {
    version: "v1.1.0",
    date: "May 15, 2026",
    title: "ABAC Release & Webhooks",
    description: "Granular control is here. We've rolled out Attribute-Based Access Control (ABAC), allowing you to restrict agent visibility based on department, tag, or custom attributes.",
    changes: [
      { type: "feature", text: "Launched Attribute-Based Access Control (ABAC)." },
      { type: "feature", text: "Added outgoing Webhook integrations for ticket lifecycle events." },
      { type: "improvement", text: "Redesigned the macro execution menu for faster access." },
      { type: "bug", text: "Fixed an issue where CC'd users weren't receiving initial notifications." }
    ]
  },
  {
    version: "v1.0.0",
    date: "April 02, 2026",
    title: "Public Beta Launch",
    description: "The initial public release of Alpis Service Desk. A massive thank you to our early alpha testers for their invaluable feedback over the last six months.",
    changes: [
      { type: "feature", text: "Core ticketing engine with email and portal ingestion." },
      { type: "feature", text: "Tenant isolation via Postgres Row-Level Security." },
      { type: "feature", text: "Basic SLA management and RBAC roles." }
    ]
  }
];

function ChangelogPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      <main className="flex-grow px-6 md:px-10 py-20 max-w-[900px] mx-auto w-full">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 text-primary font-medium text-sm mb-4 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            <Sparkles className="w-4 h-4" /> Product Updates
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Changelog</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Stay up to date with the latest features, improvements, and bug fixes in Alpis.
          </p>
        </div>
        
        <div className="space-y-16">
          {RELEASES.map((release, index) => (
            <div key={index} className="relative flex flex-col md:flex-row gap-8 md:gap-12 group">
              {/* Timeline dot & line (Desktop) */}
              <div className="hidden md:flex flex-col items-center mt-2 relative z-10">
                <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-background z-10"></div>
                {index !== RELEASES.length - 1 && (
                  <div className="w-px h-full bg-gradient-to-b from-primary/50 to-white/10 absolute top-4 left-1/2 -translate-x-1/2"></div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-on-surface">{release.version}</h2>
                  <span className="text-sm font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-white/5">
                    {release.date}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-primary/90 mb-4">{release.title}</h3>
                <p className="text-on-surface-variant leading-relaxed mb-6">
                  {release.description}
                </p>
                
                <div className="bg-surface-container-low border border-white/5 rounded-xl p-5 space-y-3">
                  {release.changes.map((change, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 shrink-0">
                        {change.type === 'feature' && <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-500/10 text-emerald-400"><Sparkles className="w-3 h-3" /></span>}
                        {change.type === 'improvement' && <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500/10 text-blue-400"><Zap className="w-3 h-3" /></span>}
                        {change.type === 'bug' && <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-500/10 text-red-400"><Bug className="w-3 h-3" /></span>}
                      </div>
                      <span className="text-on-surface/90 leading-relaxed">{change.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
