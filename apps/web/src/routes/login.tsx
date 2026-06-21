import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Ticket, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAppStore } from "../store";
import { loginSchema } from "@help-desk/shared";
import { Button, Input, FormError, FormAlert, Label, fieldErrors } from "@/components/ui";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  component: Login,
});

function Login() {
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const setUser = useAppStore((state) => state.setUser);
  const setTenantId = useAppStore((state) => state.setTenantId);
  const setAccessToken = useAppStore((state) => state.setAccessToken);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onChange: loginSchema },
    onSubmit: async ({ value }) => {
      try {
        const res = await api.auths.login.$post({ json: value });
        const data = (await res.json()) as any;
        if (!res.ok) throw new Error(data?.error?.message || "Login failed");
        const payload = data.data;
        const user = payload.user as any;
        setUser(user);
        setTenantId(user.organizationId);
        setAccessToken(payload.accessToken);
        if (returnTo) {
          window.location.href = returnTo;
        } else {
          navigate({ to: "/dashboard" });
        }
      } catch (err: any) {
        throw err;
      }
    },
  });

  return (
    <div className="min-h-[100dvh] bg-background flex">
      {/* Left panel - brand */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 border-r border-outline-variant bg-surface-container-low p-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <Ticket className="w-4 h-4 text-on-primary" />
          </div>
          <span className="font-semibold text-on-surface tracking-tight">Alpis</span>
        </Link>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            "Since switching to Alpis, our mean time to resolution dropped by 38%.
            The SLA automation alone saved us two hours of manual work per day."
          </p>
          <div>
            <p className="text-sm font-medium text-on-surface">Tomasz Wiśniewski</p>
            <p className="text-xs text-on-surface-variant">Head of IT, CoreIT Group</p>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant/40">
          Alpis Enterprise Service Desk
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-7">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Ticket className="w-3.5 h-3.5 text-on-primary" />
            </div>
            <span className="font-semibold text-on-surface tracking-tight text-sm">Alpis</span>
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
              Welcome back
            </h1>
            <p className="text-sm text-on-surface-variant">Sign in to your workspace.</p>
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
              validators={{ onChange: z.email("Invalid email address") }}
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Work email</Label>
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
              validators={{ onChange: z.string().min(8, "Password must be at least 8 characters") }}
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`${field.name}-input`}>Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
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
              children={([canSubmit, isSubmitting, errors]) => (
                <>
                  {errors?.length > 0 && <FormAlert>{String(errors[0])}</FormAlert>}
                  <Button type="submit" fullWidth disabled={!canSubmit} loading={isSubmitting}>
                    Sign in <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            />
          </form>

          <p className="text-xs text-center text-on-surface-variant">
            No account?{" "}
            <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
