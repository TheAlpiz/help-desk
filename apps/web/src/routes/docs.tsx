import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";
import { Search, Book, Terminal, Settings, Shield, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
});

function DocsPage() {
  const { t } = useTranslation("marketing");

  const sidebar = [
    {
      key: "gettingStarted",
      links: t("docs.sidebar.gettingStarted.links", { returnObjects: true }) as string[],
    },
    {
      key: "configuration",
      links: t("docs.sidebar.configuration.links", { returnObjects: true }) as string[],
    },
    {
      key: "security",
      links: t("docs.sidebar.security.links", { returnObjects: true }) as string[],
    },
    {
      key: "api",
      links: t("docs.sidebar.api.links", { returnObjects: true }) as string[],
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />

      <div className="bg-surface-container-low border-b border-white/10 sticky top-14 z-40">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hidden md:flex">
            <Book className="w-4 h-4" /> {t("docs.header")}
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
            <input
              type="text"
              placeholder={t("docs.searchPlaceholder")}
              className="w-full bg-surface-container border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/40"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono border border-outline-variant px-1.5 py-0.5 rounded text-on-surface-variant/60">
              /
            </div>
          </div>
        </div>
      </div>

      <main className="flex-grow flex max-w-[1440px] mx-auto w-full">
        <aside className="hidden lg:block w-64 shrink-0 border-r border-white/5 py-10 px-6 sticky top-[120px] h-[calc(100vh-120px)] overflow-y-auto">
          <nav className="space-y-8">
            {sidebar.map((section, i) => (
              <div key={section.key}>
                <h4 className="font-semibold text-sm text-on-surface mb-3 tracking-wide">
                  {t(`docs.sidebar.${section.key}.title`)}
                </h4>
                <ul className="space-y-2.5 text-sm text-on-surface-variant">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className={`hover:text-primary transition-colors ${i === 0 && j === 0 ? 'text-primary font-medium' : ''}`}>
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex-1 px-6 md:px-12 py-12 pb-32 max-w-4xl">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-semibold tracking-wider uppercase mb-4">
            {t("docs.content.category")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">{t("docs.content.title")}</h1>

          <div className="prose prose-invert prose-p:text-on-surface-variant prose-headings:text-on-surface prose-a:text-primary max-w-none">
            <p className="text-xl leading-relaxed mb-10">
              {t("docs.content.intro")}
            </p>

            <div className="grid sm:grid-cols-2 gap-6 not-prose mb-12">
              <div className="p-6 rounded-xl border border-white/10 bg-surface-container hover:bg-surface-container-high transition-colors group cursor-pointer">
                <Settings className="w-6 h-6 text-secondary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg mb-2">{t("docs.content.quickstart.title")}</h3>
                <p className="text-sm text-on-surface-variant mb-4">{t("docs.content.quickstart.subtitle")}</p>
                <div className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  {t("docs.content.quickstart.cta")} <ArrowRight className="w-4 h-4" />
                </div>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-surface-container hover:bg-surface-container-high transition-colors group cursor-pointer">
                <Terminal className="w-6 h-6 text-tertiary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg mb-2">{t("docs.content.api.title")}</h3>
                <p className="text-sm text-on-surface-variant mb-4">{t("docs.content.api.subtitle")}</p>
                <div className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  {t("docs.content.api.cta")} <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-12 mb-4">{t("docs.content.architectureTitle")}</h2>
            <p className="mb-6">{t("docs.content.architectureBody")}</p>

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

            <h2 className="text-2xl font-bold mt-12 mb-4">{t("docs.content.helpTitle")}</h2>
            <p>
              {t("docs.content.helpBody", {
                communityLink: (chunks: string) => `<a href="#">${chunks}</a>`,
                contactLink: (chunks: string) => chunks,
              })}
              {" "}<Link to="/contact">Support</Link>.
              {" "}Enterprise customers have access to a dedicated Slack channel and a Technical Account Manager.
            </p>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 flex justify-end">
            <a href="#" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-medium">
              {t("docs.content.nextBtn")} <ArrowRight className="w-4 h-4 text-primary" />
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
