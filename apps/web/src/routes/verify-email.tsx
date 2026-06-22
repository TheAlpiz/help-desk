import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/verify-email")({
  validateSearch: z.object({ token: z.string().optional() }),
  component: VerifyEmail,
});

type State = "pending" | "success" | "error" | "no-token";

function VerifyEmail() {
  const { t } = useTranslation("auth");
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>(token ? "pending" : "no-token");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.auths["verify-email"].$post({ json: { token } });
        const data = (await res.json()) as any;
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error?.message || "Verification failed");
        setState("success");
      } catch (err: any) {
        if (cancelled) return;
        setErrorMsg(err.message ?? "Something went wrong");
        setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Link to="/">
          <AppLogo className="h-7 w-auto" />
        </Link>

        {state === "pending" && (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
                {t("verifyEmail.pendingTitle")}
              </h1>
              <p className="text-sm text-on-surface-variant">{t("verifyEmail.pendingSubtitle")}</p>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-secondary/15 border border-secondary/25 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
                {t("verifyEmail.successTitle")}
              </h1>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {t("verifyEmail.successMessage")}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors active:scale-[0.99]"
            >
              {t("verifyEmail.signIn")}
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-error/15 border border-error/25 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-error" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
                {t("verifyEmail.errorTitle")}
              </h1>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {errorMsg ?? t("verifyEmail.errorFallback")}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {t("verifyEmail.backToSignIn")}
            </Link>
          </>
        )}

        {state === "no-token" && (
          <>
            <div className="w-12 h-12 rounded-full bg-error/15 border border-error/25 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-error" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
                {t("verifyEmail.noTokenTitle")}
              </h1>
              <p className="text-sm text-on-surface-variant">
                {t("verifyEmail.noTokenMessage")}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {t("verifyEmail.backToSignIn")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
