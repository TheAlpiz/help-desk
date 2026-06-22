import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import { Input, Button, FormAlert, FormError, fieldErrors } from "@/components/ui";

export function ForcePasswordChangeScreen() {
  const { t } = useTranslation("auth");
  const [error, setError] = useState<string | null>(null);
  const setUser = useAppStore((state) => state.setUser);
  const setAccessToken = useAppStore((state) => state.setAccessToken);
  const user = useAppStore((state) => state.user);

  const form = useForm({
    defaultValues: { newPassword: "", confirmPassword: "" },
    validators: {
      onChange: z.object({
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
      }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      }),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const res = await api.auths["change-password"].$post({ json: { newPassword: value.newPassword } });
        const body = await res.json() as any;
        if (!res.ok) {
          setError(body?.error?.message || body?.message || "Failed to update password");
          return;
        }
        
        // Backend rotates the session and returns a fresh access token whose claims
        // already carry forcePasswordChange:false. Store it so the in-memory token
        // is not left stale until the next refresh.
        if (body?.data?.accessToken) setAccessToken(body.data.accessToken);
        if (body?.data?.user) {
          setUser(body.data.user);
        } else if (user) {
          setUser({ ...user, forcePasswordChange: false });
        }
      } catch (err: any) {
        setError(err.message || "An error occurred while updating the password");
      }
    },
  });

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-background p-4 overflow-auto">
      <div className="w-full max-w-md">
        <div className="bg-surface-container border border-outline-variant rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7 text-amber-500" />
            </div>
          </div>
          
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface text-center mb-2 tracking-tight">
            Security Notice
          </h1>
          <p className="text-sm text-on-surface-variant text-center mb-8 leading-relaxed">
            Welcome to the platform! Since your account was created by an administrator, you must set a new, secure password before accessing your dashboard.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <FormAlert>{error ?? undefined}</FormAlert>

            <form.Field
              name="newPassword"
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">New Password</label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter a secure password"
                  />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )}
            />

            <form.Field
              name="confirmPassword"
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Confirm Password</label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Type the same password again"
                  />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )}
            />

            <div className="pt-2">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    fullWidth
                    disabled={!canSubmit}
                    loading={isSubmitting}
                    className="flex items-center justify-center gap-2"
                  >
                    {!isSubmitting && (
                      <>
                        Update Password
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
