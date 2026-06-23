import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav, Footer } from "../features/marketing/LandingPage";
import { Input, Button, Label } from "@/components/ui";
import { MapPin, Mail, MessageSquare, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const { t, i18n } = useTranslation("marketing");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !message) {
      setError(t("contact.form.errorFillAll"));
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const language = i18n.language?.startsWith("tr") ? "tr" : "en";
      const res = await api.contact.index.$post({
        json: { firstName, lastName, email, message, language },
      });
      if (res.ok) {
        setSuccess(true);
        setFirstName("");
        setLastName("");
        setEmail("");
        setMessage("");
      } else {
        const data = await res.json();
        setError((data as any).message || t("contact.form.errorGeneric"));
      }
    } catch (err) {
      setError(t("contact.form.errorUnexpected"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased flex flex-col selection:bg-primary/30 selection:text-primary">
      <Nav />
      <main className="flex-grow">
        <section className="px-6 md:px-10 py-24 max-w-[1280px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Left Col: Info */}
            <div className="space-y-12">
              <div>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                  {t("contact.hero.title")}
                </h1>
                <p className="text-xl text-on-surface-variant leading-relaxed max-w-md">
                  {t("contact.hero.subtitle")}
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {t("contact.channels.sales.title")}
                    </h3>
                    <p className="text-on-surface-variant text-sm mb-2">
                      {t("contact.channels.sales.subtitle")}
                    </p>
                    <a
                      href="mailto:sales@alpis.io"
                      className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      sales@yerliva.com <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {t("contact.channels.support.title")}
                    </h3>
                    <p className="text-on-surface-variant text-sm mb-2">
                      {t("contact.channels.support.subtitle")}
                    </p>
                    <a
                      href="mailto:support@alpis.io"
                      className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      support@yerliva.com <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {t("contact.channels.hq.title")}
                    </h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line">
                      {t("contact.channels.hq.address")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Form */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-secondary/10 blur-xl rounded-[2rem] -z-10" />

              <div className="bg-surface-container/60 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] border border-white/10 shadow-2xl">
                <h3 className="text-2xl font-bold mb-6">
                  {t("contact.form.title")}
                </h3>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {success && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium">
                      {t("contact.form.successMsg")}
                    </div>
                  )}
                  {error && (
                    <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium">
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="first-name"
                        className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
                      >
                        {t("contact.form.firstName")}
                      </Label>
                      <Input
                        id="first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jane"
                        className="bg-background/50 border-white/5 focus:bg-background"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="last-name"
                        className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
                      >
                        {t("contact.form.lastName")}
                      </Label>
                      <Input
                        id="last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="bg-background/50 border-white/5 focus:bg-background"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
                    >
                      {t("contact.form.workEmail")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="bg-background/50 border-white/5 focus:bg-background"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="message"
                      className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
                    >
                      {t("contact.form.message")}
                    </Label>
                    <textarea
                      id="message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-background/50 border border-white/5 rounded-xl text-sm text-on-surface focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-all resize-none shadow-inner"
                      placeholder={t("contact.form.messagePlaceholder")}
                    ></textarea>
                  </div>

                  <Button
                    className="w-full py-6 rounded-xl font-semibold text-base bg-primary hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(var(--color-primary),0.3)] transition-all"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? t("contact.form.sending")
                      : t("contact.form.submit")}
                  </Button>
                  <p className="text-xs text-center text-on-surface-variant/60 mt-4">
                    {t("contact.form.privacyPrefix")}{" "}
                    <Link
                      to="/privacy"
                      className="underline hover:text-on-surface"
                    >
                      {t("contact.form.privacyLink")}
                    </Link>
                    .
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
