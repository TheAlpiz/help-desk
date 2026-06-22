import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Ticket, ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { forgotPasswordSchema } from "@help-desk/shared";
import { Button, Input, FormError, Label, fieldErrors } from "@/components/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const { t } = useTranslation("auth");
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onChange: forgotPasswordSchema },
    onSubmit: async ({ value }) => {
      await api.auths["forgot-password"]
        .$post({ json: { email: value.email } })
        .catch(() => {});
      setSubmitted(true);
    },
  });

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-7">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Ticket className="w-3.5 h-3.5 text-on-primary" />
          </div>
          <span className="font-semibold text-on-surface text-sm">Alpis</span>
        </Link>

        {submitted ? (
          <div className="flex flex-col gap-5">
            <div className="w-12 h-12 rounded-full bg-secondary/15 border border-secondary/25 flex items-center justify-center">
              <Mail className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
                {t("forgotPassword.successTitle")}
              </h1>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {t("forgotPassword.successMessage")}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("forgotPassword.backToSignIn")}
            </Link>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
                {t("forgotPassword.title")}
              </h1>
              <p className="text-sm text-on-surface-variant">
                {t("forgotPassword.subtitle")}
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
              <form.Field
                name="email"
                validators={{ onChange: forgotPasswordSchema.shape.email }}
                children={(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>{t("forgotPassword.workEmail")}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      autoComplete="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={t("forgotPassword.emailPlaceholder")}
                    />
                    <FormError>
                      {fieldErrors(field.state.meta.errors)}
                    </FormError>
                  </div>
                )}
              />

              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    fullWidth
                    disabled={!canSubmit}
                    loading={isSubmitting}
                  >
                    {!isSubmitting && t("forgotPassword.submit")}
                  </Button>
                )}
              />
            </form>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("forgotPassword.backToSignIn")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
