import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { Terminal, Home, ArrowLeft } from "lucide-react";
import { QueryClient } from "@tanstack/react-query";
import { CommandPalette } from "../components/CommandPalette";
import { RouterErrorBoundary } from "../components/ErrorBoundary";

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-error/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl w-full grid md:grid-cols-2 gap-10 items-center">
        {/* Left — text + actions */}
        <div className="flex flex-col gap-5 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-error/10 border border-error/20 rounded-full w-fit mx-auto md:mx-0">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
            <span className="text-xs font-mono text-error tracking-widest">404 NOT FOUND</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-on-surface tracking-tight">Route not found</h1>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed max-w-xs mx-auto md:mx-0">
              The page you're looking for doesn't exist or has been moved to another URL.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center md:justify-start">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              Go home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-outline-variant text-on-surface-variant text-sm font-medium rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go back
            </button>
          </div>
        </div>

        {/* Right — terminal */}
        <div className="bg-black rounded-xl border border-outline-variant overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
            <div className="w-2.5 h-2.5 rounded-full bg-error/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant/30">
              <Terminal className="w-3 h-3" />
              bash — zsh
            </div>
          </div>
          <div className="p-5 font-mono text-xs leading-6 space-y-1 text-on-surface-variant/70">
            <div>
              <span className="text-emerald-400">user@helpdesk</span>
              <span className="text-on-surface-variant/30">:</span>
              <span className="text-primary">~</span>
              <span className="text-on-surface-variant/40">$ </span>
              <span className="text-on-surface">cd &quot;{typeof window !== "undefined" ? window.location.pathname : "/404"}&quot;</span>
            </div>
            <div className="text-error">bash: cd: No such file or directory</div>
            <div className="mt-1">
              <span className="text-emerald-400">user@helpdesk</span>
              <span className="text-on-surface-variant/30">:</span>
              <span className="text-primary">~</span>
              <span className="text-on-surface-variant/40">$ </span>
              <span className="text-on-surface">find / -name &quot;route&quot; 2&gt;/dev/null</span>
            </div>
            <div className="text-on-surface-variant/40">Searching...</div>
            <div className="text-on-surface-variant/40">0 results found.</div>
            <div className="flex items-center gap-0.5 mt-1">
              <span className="text-emerald-400">user@helpdesk</span>
              <span className="text-on-surface-variant/30">:</span>
              <span className="text-primary">~</span>
              <span className="text-on-surface-variant/40">$ </span>
              <span className="inline-block w-2 h-3.5 bg-on-surface/60 ml-0.5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Outlet />
      <CommandPalette />
    </>
  ),
  notFoundComponent: NotFoundComponent,
  errorComponent: RouterErrorBoundary,
});
