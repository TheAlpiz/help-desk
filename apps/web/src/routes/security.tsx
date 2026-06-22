import { createFileRoute } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";
import { Shield, Lock, Database, Key, Server, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const { t } = useTranslation("marketing");
  const authItems = t("security.cards.auth.items", { returnObjects: true }) as string[];

  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      <main className="flex-grow px-6 md:px-10 py-20 max-w-[1000px] mx-auto w-full">
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6 shadow-[0_0_30px_rgba(var(--color-primary),0.2)]">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">{t("security.hero.title")}</h1>
          <p className="text-on-surface-variant text-xl max-w-2xl mx-auto leading-relaxed">
            {t("security.hero.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="p-8 rounded-2xl bg-surface-container border border-white/5 hover:border-white/10 transition-colors">
            <Database className="w-8 h-8 text-secondary mb-5" />
            <h3 className="text-2xl font-bold mb-3">{t("security.cards.dbIsolation.title")}</h3>
            <p className="text-on-surface-variant leading-relaxed mb-4"
              dangerouslySetInnerHTML={{ __html: t("security.cards.dbIsolation.p1") }}
            />
            <p className="text-on-surface-variant leading-relaxed">
              {t("security.cards.dbIsolation.p2")}
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-surface-container border border-white/5 hover:border-white/10 transition-colors">
            <Lock className="w-8 h-8 text-primary mb-5" />
            <h3 className="text-2xl font-bold mb-3">{t("security.cards.encryption.title")}</h3>
            <p className="text-on-surface-variant leading-relaxed mb-4"
              dangerouslySetInnerHTML={{ __html: t("security.cards.encryption.p1") }}
            />
            <p className="text-on-surface-variant leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t("security.cards.encryption.p2") }}
            />
          </div>

          <div className="p-8 rounded-2xl bg-surface-container border border-white/5 hover:border-white/10 transition-colors">
            <Key className="w-8 h-8 text-tertiary mb-5" />
            <h3 className="text-2xl font-bold mb-3">{t("security.cards.auth.title")}</h3>
            <ul className="space-y-3">
              {authItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-on-surface-variant text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-8 rounded-2xl bg-surface-container border border-white/5 hover:border-white/10 transition-colors">
            <Server className="w-8 h-8 text-white/80 mb-5" />
            <h3 className="text-2xl font-bold mb-3">{t("security.cards.infra.title")}</h3>
            <p className="text-on-surface-variant leading-relaxed mb-4">
              {t("security.cards.infra.p1")}
            </p>
            <div className="inline-block px-3 py-1 mt-2 bg-white/5 border border-white/10 rounded text-xs font-mono text-on-surface-variant uppercase tracking-widest">
              {t("security.cards.infra.badge")}
            </div>
          </div>
        </div>

        <div className="p-10 rounded-3xl bg-gradient-to-br from-primary/20 to-surface-container border border-primary/20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full mix-blend-screen pointer-events-none" />
          <h3 className="text-2xl font-bold text-white mb-4 relative z-10">{t("security.disclosure.title")}</h3>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-6 relative z-10">
            {t("security.disclosure.subtitle")}
          </p>
          <a href="mailto:security@alpis.io" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-colors relative z-10">
            {t("security.disclosure.cta")}
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
