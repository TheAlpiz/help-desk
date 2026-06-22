import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { api } from "../lib/api";
import { useAppStore } from "../store";
import { loginSchema } from "@help-desk/shared";
import { Button, Input, FormError, FormAlert, Label, fieldErrors } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { SupportedLanguage } from "@/i18n";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ returnTo: z.string().optional(), reason: z.string().optional() }),
  component: Login,
});

// Only allow same-origin relative paths as a post-login redirect target. Anything
// else (absolute URL, protocol-relative "//evil.com", non-"/" string) is rejected
// to prevent open-redirect phishing via the returnTo parameter.
function safeReturnTo(returnTo: string | undefined): string | null {
  if (!returnTo) return null;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return null;
  return returnTo;
}

function Login() {
  const { t } = useTranslation(["auth", "common"]);
  const { returnTo, reason } = Route.useSearch();
  const navigate = useNavigate();
  const setUser = useAppStore((state) => state.setUser);
  const setTenantId = useAppStore((state) => state.setTenantId);
  const setAccessToken = useAppStore((state) => state.setAccessToken);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onChange: loginSchema as any },
    onSubmit: async ({ value }) => {
      try {
        const res = await api.auths.login.$post({ json: value });
        const data = (await res.json()) as any;
        if (!res.ok) throw new Error(data?.error?.message || t("auth:login.failed"));
        const payload = data.data;
        const user = payload.user as any;
        setUser(user);
        setTenantId(user.organizationId);
        setAccessToken(payload.accessToken);
        // Apply the user's stored language preference
        if (user.preferredLanguage) {
          setLanguage(user.preferredLanguage as SupportedLanguage);
        }
        // SPA navigation preserves the just-set in-memory access token (a full
        // reload would drop it and force a bootstrapAuth refresh cycle).
        const dest = safeReturnTo(returnTo);
        navigate({ to: (dest ?? "/dashboard") as string });
      } catch (err: any) {
        throw err;
      }
    },
  });

  return (
    <div className="min-h-[100dvh] bg-background flex">
      {/* Left panel - brand */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 border-r border-outline-variant bg-surface-container-low p-10">
        <Link to="/">
          <AppLogo className="h-8 w-auto" />
        </Link>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {t("auth:login.testimonial")}
          </p>
          <div>
            <p className="text-sm font-medium text-on-surface">{t("auth:login.testimonialAuthor")}</p>
            <p className="text-xs text-on-surface-variant">{t("auth:login.testimonialRole")}</p>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant/40">
          {t("common:app.name")} {t("common:app.tagline")}
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-7">
          <div className="flex items-center justify-between">
            <Link to="/" className="lg:hidden">
              <AppLogo className="h-7 w-auto" />
            </Link>
            <div className="ml-auto">
              <LanguageSwitcher variant="dropdown" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
              {t("auth:login.subtitle")}
            </h1>
            <p className="text-sm text-on-surface-variant">{t("auth:login.title")}</p>
          </div>

          {reason === "session-expired" && (
            <FormAlert>{t("auth:login.sessionExpired")}</FormAlert>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            <form.Field
              name="email"
              validators={{ onChange: z.email(t("common:errors.invalidEmail")) }}
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>{t("auth:login.email")}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="you@company.com"
                  />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )}
            />

            <form.Field
              name="password"
              validators={{ onChange: z.string().min(8, t("common:errors.tooShort", { min: 8 })) }}
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`${field.name}-input`}>{t("auth:login.password")}</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      {t("auth:login.forgotPassword")}
                    </Link>
                  </div>
                  <Input
                    id={`${field.name}-input`}
                    name={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )}
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting, state.errors]}
              children={([canSubmit, isSubmitting, errors]: any) => (
                <>
                  {(errors as any[])?.length > 0 && <FormAlert>{String((errors as any)[0])}</FormAlert>}
                  <Button type="submit" fullWidth disabled={!canSubmit} loading={isSubmitting}>
                    {isSubmitting ? t("auth:login.submitting") : t("auth:login.submit")}
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </>
              )}
            />
          </form>

          <p className="text-xs text-center text-on-surface-variant">
            {t("auth:login.noAccount")}{" "}
            <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              {t("auth:login.register")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
