import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { api } from "../lib/api";
import { useAppStore } from "../store";
import { resetPasswordSchema } from "@help-desk/shared";
import { Button, Input, FormError, FormAlert, Label, fieldErrors } from "@/components/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: z.object({ token: z.string().optional() }),
  component: AcceptInvite,
});

function AcceptInvite() {
  const { t } = useTranslation("auth");
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { setUser, setTenantId, setAccessToken } = useAppStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      if (!token) return;
      setSubmitError(null);
      try {
        const res = await api.auths["accept-invite"].$post({
          json: { token, password: value.password },
        });
        // Defensive parse: a server error (e.g. 502) returns no JSON body.
        const data = (await res.json().catch(() => null)) as any;
        if (!res.ok || !data)
          throw new Error(data?.error?.message || "Failed to accept invite");

        // accept-invite issues a live session — log the new user straight in.
        if (data?.data?.accessToken) {
          const payload = data.data;
          setUser(payload.user);
          setTenantId(payload.user.organizationId);
          setAccessToken(payload.accessToken);
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/login" });
        }
      } catch (err: any) {
        setSubmitError(err.message ?? "Something went wrong");
      }
    },
  });

  if (!token) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-6 text-center">
          <div className="w-12 h-12 rounded-full bg-error/15 border border-error/25 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5 text-error" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface mb-1">
              {t("acceptInvite.invalidTitle")}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {t("acceptInvite.invalidMessage")}
            </p>
          </div>
          <Link
            to="/login"
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {t("acceptInvite.backToSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-7">
        <Link to="/">
          <AppLogo className="h-7 w-auto" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
            {t("acceptInvite.title")}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {t("acceptInvite.subtitle")}
          </p>
        </div>

        {submitError && <FormAlert>{submitError}</FormAlert>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field
            name="password"
            validators={{ onChange: resetPasswordSchema.shape.password }}
            children={(field) => (
              <div className="flex flex-col gap-1.5">
                <Label>{t("acceptInvite.password")}</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="••••••••"
                />
                <FormError>
                  {fieldErrors(field.state.meta.errors)}
                </FormError>
              </div>
            )}
          />

          <form.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["password"],
              onChange: ({ value, fieldApi }) =>
                value !== fieldApi.form.getFieldValue("password")
                  ? t("acceptInvite.passwordMismatch")
                  : undefined,
            }}
            children={(field) => (
              <div className="flex flex-col gap-1.5">
                <Label>{t("acceptInvite.confirmPassword")}</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="••••••••"
                />
                <FormError>
                  {fieldErrors(field.state.meta.errors)}
                </FormError>
              </div>
            )}
          />

          <form.Subscribe
            selector={(s) => [s.canSubmit, s.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                fullWidth
                disabled={!canSubmit}
                loading={isSubmitting}
              >
                {!isSubmitting && t("acceptInvite.activateBtn")}
              </Button>
            )}
          />
        </form>
      </div>
    </div>
  );
}
