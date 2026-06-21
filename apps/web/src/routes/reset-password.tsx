import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Ticket, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { resetPasswordSchema } from "@help-desk/shared";
import { Button, Input, FormError, FormAlert, Label, fieldErrors } from "@/components/ui";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: z.string().optional() }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      if (!token) return;
      setSubmitError(null);
      try {
        const res = await api.auths["reset-password"].$post({
          json: { token, password: value.password },
        });
        const data = (await res.json()) as any;
        if (!res.ok) throw new Error(data?.error?.message || "Reset failed");
        setSuccess(true);
        setTimeout(() => navigate({ to: "/login" }), 3000);
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
            <h1 className="text-xl font-bold text-on-surface mb-1">Invalid link</h1>
            <p className="text-sm text-on-surface-variant">
              This reset link is missing a token. Request a new one.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Request password reset
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Ticket className="w-3.5 h-3.5 text-on-primary" />
            </div>
            <span className="font-semibold text-on-surface text-sm">Alpis</span>
          </Link>
          <div className="w-12 h-12 rounded-full bg-secondary/15 border border-secondary/25 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
              Password updated
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Your password has been reset. Redirecting to sign in…
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-7">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Ticket className="w-3.5 h-3.5 text-on-primary" />
          </div>
          <span className="font-semibold text-on-surface text-sm">Alpis</span>
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
            Set new password
          </h1>
          <p className="text-sm text-on-surface-variant">Must be at least 8 characters.</p>
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
                <Label htmlFor={field.name}>New password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="••••••••"
                />
                <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
              </div>
            )}
          />

          <form.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["password"],
              onChange: ({ value, fieldApi }) => {
                if (value !== fieldApi.form.getFieldValue("password")) {
                  return "Passwords do not match";
                }
                return undefined;
              },
            }}
            children={(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Confirm password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="••••••••"
                />
                <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
              </div>
            )}
          />

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button type="submit" fullWidth disabled={!canSubmit} loading={isSubmitting}>
                {!isSubmitting && "Reset password"}
              </Button>
            )}
          />
        </form>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
