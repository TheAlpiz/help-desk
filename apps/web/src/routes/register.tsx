import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Check } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { api } from "../lib/api";
import { useAppStore } from "../store";
import { registerSchema } from "@help-desk/shared";
import { Button, Input, FormError, FormAlert, Label, fieldErrors } from "@/components/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const setUser = useAppStore((state) => state.setUser);
  const setTenantId = useAppStore((state) => state.setTenantId);
  const setAccessToken = useAppStore((state) => state.setAccessToken);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const req = t("register.validation.required");

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      organizationName: "",
      password: "",
    },
    validators: { onChange: registerSchema },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        const res = await api.auths.register.$post({ json: value });
        const data = (await res.json()) as any;
        if (!res.ok) throw new Error(data?.error?.message || data?.message || t("register.failed"));
        const payload = data.data;
        const user = payload.user;
        setUser(user);
        setTenantId(user.organizationId);
        setAccessToken(payload.accessToken);
        navigate({ to: "/onboarding" });
      } catch (err: any) {
        setSubmitError(err.message || t("register.failed"));
      }
    },
  });

  const benefits = t("register.benefits", { returnObjects: true }) as string[];

  return (
    <div className="min-h-[100dvh] bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 border-r border-outline-variant bg-surface-container-low p-10">
        <Link to="/">
          <AppLogo className="h-8 w-auto" />
        </Link>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-2xl font-bold text-on-surface tracking-tight mb-2 whitespace-pre-line">
              {t("register.sideHeading")}
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {t("register.sideSubtitle")}
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                <div className="w-5 h-5 rounded-full bg-secondary/15 border border-secondary/25 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-secondary" />
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-on-surface-variant/40">{t("register.sideFooter")}</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-7">
          <Link to="/" className="lg:hidden">
            <AppLogo className="h-7 w-auto" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
              {t("register.title")}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {t("register.subtitle")}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            {submitError && <FormAlert>{submitError}</FormAlert>}

            <div className="grid grid-cols-2 gap-3">
              <form.Field
                name="firstName"
                validators={{ onChange: z.string().min(1, req) }}
                children={(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>{t("register.firstName")}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      autoComplete="given-name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Tomasz"
                    />
                    <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                  </div>
                )}
              />
              <form.Field
                name="lastName"
                validators={{ onChange: z.string().min(1, req) }}
                children={(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>{t("register.lastName")}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      autoComplete="family-name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Wiśniewski"
                    />
                    <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                  </div>
                )}
              />
            </div>

            <form.Field
              name="organizationName"
              validators={{ onChange: z.string().min(2) }}
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>{t("register.orgName")}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="text"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="CoreIT Group"
                  />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )}
            />

            <form.Field
              name="email"
              validators={{ onChange: z.string().email() }}
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>{t("register.workEmail")}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("register.emailPlaceholder")}
                  />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )}
            />

            <form.Field
              name="password"
              validators={{ onChange: z.string().min(8) }}
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${field.name}-input`}>{t("register.password")}</Label>
                  <Input
                    id={`${field.name}-input`}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={t("register.passwordPlaceholder")}
                  />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )}
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" fullWidth disabled={!canSubmit} loading={isSubmitting}>
                  {t("register.createBtn")} <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            />

            <p className="text-[11px] text-on-surface-variant/50 text-center leading-relaxed">
              {t("register.termsPrefix")}{" "}
              <Link to="/terms" className="text-primary/70 hover:text-primary">{t("register.termsLink")}</Link>{" "}
              {t("register.termsAnd")}{" "}
              <Link to="/privacy" className="text-primary/70 hover:text-primary">{t("register.privacyLink")}</Link>.
            </p>
          </form>

          <p className="text-xs text-center text-on-surface-variant">
            {t("register.haveAccount")}{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              {t("register.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
