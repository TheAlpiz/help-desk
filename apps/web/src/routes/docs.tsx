import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";
import { Search, Book, Terminal, Settings, Shield, Workflow, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
});

const SIDEBAR_LINKS = [
  {
    title: "Getting Started",
    links: ["Introduction", "Quickstart", "Installation", "Core Concepts"]
  },
  {
    title: "Configuration",
    links: ["Mailboxes (IMAP/SMTP)", "Departments", "SLA Policies", "Routing Rules"]
  },
  {
    title: "Security & Users",
    links: ["RBAC Roles", "ABAC Scopes", "SSO Configuration", "Audit Logs"]
  },
  {
    title: "Developer API",
    links: ["Authentication", "REST Endpoints", "Webhooks", "Rate Limits"]
  }
];

function DocsPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      
      {/* Docs Header w/ Search */}
      <div className="bg-surface-container-low border-b border-white/10 sticky top-14 z-40">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hidden md:flex">
            <Book className="w-4 h-4" /> Alpis Documentation
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
            <input 
              type="text" 
              placeholder="Search documentation... (Press '/')"
              className="w-full bg-surface-container border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/40"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono border border-outline-variant px-1.5 py-0.5 rounded text-on-surface-variant/60">
              /
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow flex max-w-[1440px] mx-auto w-full">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-white/5 py-10 px-6 sticky top-[120px] h-[calc(100vh-120px)] overflow-y-auto">
          <nav className="space-y-8">
            {SIDEBAR_LINKS.map((section, i) => (
              <div key={i}>
                <h4 className="font-semibold text-sm text-on-surface mb-3 tracking-wide">{section.title}</h4>
                <ul className="space-y-2.5 text-sm text-on-surface-variant">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className={`hover:text-primary transition-colors ${i===0 && j===0 ? 'text-primary font-medium' : ''}`}>
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 px-6 md:px-12 py-12 pb-32 max-w-4xl">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            Getting Started
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Introduction to Alpis</h1>
          
          <div className="prose prose-invert prose-p:text-on-surface-variant prose-headings:text-on-surface prose-a:text-primary max-w-none">
            <p className="text-xl leading-relaxed mb-10">
              Alpis is a high-performance, developer-friendly IT service desk. This documentation covers everything from initial setup to advanced API integrations.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 not-prose mb-12">
              <div className="p-6 rounded-xl border border-white/10 bg-surface-container hover:bg-surface-container-high transition-colors group cursor-pointer">
                <Settings className="w-6 h-6 text-secondary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg mb-2">Quickstart Guide</h3>
                <p className="text-sm text-on-surface-variant mb-4">Get your service desk running in under 5 minutes.</p>
                <div className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read guide <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-surface-container hover:bg-surface-container-high transition-colors group cursor-pointer">
                <Terminal className="w-6 h-6 text-tertiary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg mb-2">API Reference</h3>
                <p className="text-sm text-on-surface-variant mb-4">Interact programmatically with tickets and users.</p>
                <div className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  View API <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-12 mb-4">Core Architecture</h2>
            <p className="mb-6">
              Alpis is built on a multi-tenant PostgreSQL database using Row-Level Security (RLS) to guarantee data isolation. 
              The backend leverages Node.js with tRPC for end-to-end type safety, while the frontend is a React SPA powered by Vite and TanStack Router.
            </p>

            <div className="bg-[#16161a] rounded-xl border border-white/10 overflow-hidden not-prose mb-8">
              <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-xs text-on-surface-variant font-mono ml-2">install.sh</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-white/80">
                  <span className="text-primary"># Clone the repository (for self-hosted Enterprise)</span>{'\n'}
                  git clone https://github.com/alpis/alpis-helm.git{'\n'}
                  cd alpis-helm{'\n\n'}
                  <span className="text-primary"># Deploy via Helm</span>{'\n'}
                  helm install alpis ./charts/alpis \ {'\n'}
                  {'  '}--set postgres.password=YOUR_SECURE_PASSWORD \ {'\n'}
                  {'  '}--set app.jwtSecret=YOUR_JWT_SECRET
                </pre>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-12 mb-4">Getting Help</h2>
            <p>
              If you get stuck, check out our <a href="#">Community Forums</a> or reach out to <Link to="/contact">Support</Link>. 
              Enterprise customers have access to a dedicated Slack channel and a Technical Account Manager.
            </p>
          </div>
          
          <div className="mt-16 pt-8 border-t border-white/10 flex justify-end">
            <a href="#" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-medium">
              Next: Quickstart <ArrowRight className="w-4 h-4 text-primary" />
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
