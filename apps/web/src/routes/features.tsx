import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";
import { Ticket, Shield, Workflow, BarChart, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
});

const SECTION_ICONS: Record<string, React.ElementType> = {
  omnichannel: Ticket,
  automation: Workflow,
  security: Shield,
  analytics: BarChart,
};

function FeatureSection({ sectionKey, reversed = false }: { sectionKey: string; reversed?: boolean }) {
  const { t } = useTranslation("marketing");
  const Icon = SECTION_ICONS[sectionKey];
  const title = t(`features.sections.${sectionKey}.title`);
  const description = t(`features.sections.${sectionKey}.description`);
  const features = t(`features.sections.${sectionKey}.features`, { returnObjects: true }) as string[];

  return (
    <div className={`flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 lg:gap-20 py-20 border-b border-white/5 last:border-0`}>
      <div className="flex-1 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
          <Icon className="w-4 h-4" />
          <span>{title}</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-on-surface tracking-tight leading-tight">
          {description}
        </h2>
        <ul className="space-y-4 pt-4">
          {features.map((feat, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <span className="text-on-surface-variant leading-relaxed">{feat}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 w-full">
        <div className="relative aspect-square md:aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-br from-surface-container to-background overflow-hidden flex items-center justify-center group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-colors duration-700" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
          <div className="relative z-10 w-32 h-32 rounded-2xl bg-surface-container-high border border-white/10 shadow-2xl flex items-center justify-center transform group-hover:scale-105 group-hover:-rotate-3 transition-all duration-500">
            <Icon className="w-12 h-12 text-on-surface/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesPage() {
  const { t } = useTranslation("marketing");

  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      <main className="flex-grow">
        <section className="relative px-6 md:px-10 pt-24 pb-32 max-w-[1280px] mx-auto overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 whitespace-pre-line">
              {t("features.hero.title")}
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed">
              {t("features.hero.subtitle")}
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 font-medium text-sm bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(var(--color-primary),0.3)] active:scale-95">
                {t("features.hero.startTrial")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-10 py-12 max-w-[1280px] mx-auto">
          <FeatureSection sectionKey="omnichannel" />
          <FeatureSection sectionKey="automation" reversed />
          <FeatureSection sectionKey="security" />
          <FeatureSection sectionKey="analytics" reversed />
        </section>

        <section className="px-6 md:px-10 py-32 mt-12 bg-surface-container-low border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t("features.cta.title")}</h2>
            <p className="text-lg text-on-surface-variant">{t("features.cta.subtitle")}</p>
            <div className="flex justify-center">
              <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 font-semibold text-base bg-white text-black rounded-lg hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-xl">
                {t("features.cta.btn")} <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
