import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Ticket, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../lib/api";

export const Route = createFileRoute("/verify-email")({
  validateSearch: z.object({ token: z.string().optional() }),
  component: VerifyEmail,
});

type State = "pending" | "success" | "error" | "no-token";

function VerifyEmail() {
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
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Ticket className="w-3.5 h-3.5 text-on-primary" />
          </div>
          <span className="font-semibold text-on-surface text-sm">Alpis</span>
        </Link>

        {state === "pending" && (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
                Verifying…
              </h1>
              <p className="text-sm text-on-surface-variant">Confirming your email address.</p>
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
                Email verified
              </h1>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Your email address has been confirmed. You can now sign in.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors active:scale-[0.99]"
            >
              Sign in
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
                Verification failed
              </h1>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {errorMsg ?? "This link may have expired or already been used."}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Back to sign in
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
                Invalid link
              </h1>
              <p className="text-sm text-on-surface-variant">
                This verification link is missing a token.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
