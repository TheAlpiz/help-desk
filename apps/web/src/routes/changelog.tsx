import { createFileRoute } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";
import { Sparkles, Bug, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/changelog")({
  component: ChangelogPage,
});

type ChangeItem = { type: string; text: string };
type Release = { version: string; date: string; title: string; description: string; changes: ChangeItem[] };

function ChangelogPage() {
  const { t } = useTranslation("marketing");
  const releases = t("changelog.releases", { returnObjects: true }) as Release[];

  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      <main className="flex-grow px-6 md:px-10 py-20 max-w-[900px] mx-auto w-full">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 text-primary font-medium text-sm mb-4 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            <Sparkles className="w-4 h-4" /> {t("changelog.hero.badge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">{t("changelog.hero.title")}</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            {t("changelog.hero.subtitle")}
          </p>
        </div>

        <div className="space-y-16">
          {releases.map((release, index) => (
            <div key={release.version} className="relative flex flex-col md:flex-row gap-8 md:gap-12 group">
              {/* Timeline dot & line (Desktop) */}
              <div className="hidden md:flex flex-col items-center mt-2 relative z-10">
                <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-background z-10"></div>
                {index !== releases.length - 1 && (
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
