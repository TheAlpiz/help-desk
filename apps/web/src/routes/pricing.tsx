import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";
import { Check, X, HelpCircle, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

function PricingPage() {
  const { t } = useTranslation("marketing");

  const faqs = t("pricing.faq.items", { returnObjects: true }) as { q: string; a: string }[];
  const starterFeatures = t("pricing.plans.starter.features", { returnObjects: true }) as string[];
  const proFeatures = t("pricing.plans.pro.features", { returnObjects: true }) as string[];
  const enterpriseFeatures = t("pricing.plans.enterprise.features", { returnObjects: true }) as string[];
  const compareRows = t("pricing.compare.rows", { returnObjects: true }) as { label: string; s?: string; p?: string; e?: string }[];

  const compareData = [
    { label: compareRows[0]?.label, s: compareRows[0]?.s ?? "3", p: compareRows[0]?.p ?? "5 (base)", e: compareRows[0]?.e ?? "Custom" },
    { label: compareRows[1]?.label, s: compareRows[1]?.s ?? "500", p: compareRows[1]?.p ?? "Unlimited", e: compareRows[1]?.e ?? "Unlimited" },
    { label: compareRows[2]?.label, s: compareRows[2]?.s ?? "1", p: compareRows[2]?.p ?? "10", e: compareRows[2]?.e ?? "Unlimited" },
    { label: compareRows[3]?.label, s: false, p: true, e: true },
    { label: compareRows[4]?.label, s: false, p: true, e: true },
    { label: compareRows[5]?.label, s: false, p: true, e: true },
    { label: compareRows[6]?.label, s: false, p: true, e: true },
    { label: compareRows[7]?.label, s: false, p: false, e: true },
    { label: compareRows[8]?.label, s: false, p: false, e: true },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      <main className="flex-grow">
        <section className="relative px-6 md:px-10 pt-24 pb-20 max-w-[1280px] mx-auto text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-secondary/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
              {t("pricing.hero.title")}
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed">
              {t("pricing.hero.subtitle")}
            </p>
          </div>
        </section>

        <section className="px-6 md:px-10 pb-24 max-w-[1280px] mx-auto relative z-10">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">

            {/* Starter */}
            <div className="rounded-2xl border border-white/10 bg-surface-container/50 backdrop-blur-sm p-8 flex flex-col h-full hover:border-white/20 transition-colors">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-on-surface mb-2">{t("pricing.plans.starter.name")}</h3>
                <p className="text-sm text-on-surface-variant">{t("pricing.plans.starter.tagline")}</p>
              </div>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">{t("pricing.plans.starter.price")}</span>
                <span className="text-on-surface-variant font-medium">{t("pricing.plans.starter.period")}</span>
              </div>
              <Link to="/register" className="w-full text-center px-6 py-3 bg-surface-container-high hover:bg-surface-bright rounded-xl font-semibold transition-all mb-8">
                {t("pricing.plans.starter.cta")}
              </Link>
              <div className="space-y-4 flex-grow">
                <p className="text-sm font-semibold text-on-surface">{t("pricing.plans.starter.includesLabel")}</p>
                <ul className="space-y-3">
                  {starterFeatures.map((feat, i) => (
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
                {t("pricing.mostPopular")}
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">{t("pricing.plans.pro.name")}</h3>
                <p className="text-sm text-on-surface-variant">{t("pricing.plans.pro.tagline")}</p>
              </div>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">{t("pricing.plans.pro.price")}</span>
                <span className="text-on-surface-variant font-medium">{t("pricing.plans.pro.period")}</span>
              </div>
              <Link to="/register" className="w-full text-center px-6 py-3 bg-primary text-on-primary hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)] rounded-xl font-semibold transition-all active:scale-95 mb-8">
                {t("pricing.plans.pro.cta")}
              </Link>
              <div className="space-y-4 flex-grow">
                <p className="text-sm font-semibold text-on-surface">{t("pricing.plans.pro.includesLabel")}</p>
                <ul className="space-y-3">
                  {proFeatures.map((feat, i) => (
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
                <h3 className="text-2xl font-bold text-on-surface mb-2">{t("pricing.plans.enterprise.name")}</h3>
                <p className="text-sm text-on-surface-variant">{t("pricing.plans.enterprise.tagline")}</p>
              </div>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">{t("pricing.plans.enterprise.price")}</span>
              </div>
              <a href="mailto:sales@alpis.io" className="w-full text-center px-6 py-3 border border-white/20 hover:bg-white/5 rounded-xl font-semibold transition-all mb-8">
                {t("pricing.plans.enterprise.cta")}
              </a>
              <div className="space-y-4 flex-grow">
                <p className="text-sm font-semibold text-on-surface">{t("pricing.plans.enterprise.includesLabel")}</p>
                <ul className="space-y-3">
                  {enterpriseFeatures.map((feat, i) => (
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
            <h2 className="text-3xl font-bold text-center mb-12">{t("pricing.compare.title")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 font-semibold text-on-surface w-1/3">{t("pricing.compare.featureCol")}</th>
                    <th className="py-4 font-semibold text-center w-2/9">{t("pricing.plans.starter.name")}</th>
                    <th className="py-4 font-semibold text-center text-primary w-2/9">{t("pricing.plans.pro.name")}</th>
                    <th className="py-4 font-semibold text-center w-2/9">{t("pricing.plans.enterprise.name")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {compareData.map((row, i) => (
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
            <h2 className="text-3xl font-bold mb-4">{t("pricing.faq.title")}</h2>
            <p className="text-on-surface-variant">{t("pricing.faq.subtitle")} <Link to="/contact" className="text-primary hover:underline">{t("pricing.faq.contactLink")}</Link></p>
          </div>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
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
