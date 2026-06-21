import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { z } from "zod";
import { Ticket, ArrowRight, Check } from "lucide-react";
import { api } from "../lib/api";
import { useAppStore } from "../store";
import { registerSchema } from "@help-desk/shared";
import { Button, Input, FormError, FormAlert, Label, fieldErrors } from "@/components/ui";

export const Route = createFileRoute("/register")({
  component: Register,
});

const BENEFITS = [
  "14-day free trial, no credit card",
  "Unlimited tickets during trial",
  "Full RBAC and multi-tenant isolation",
  "Email, SLA, and audit logs included",
];

function Register() {
  const navigate = useNavigate();
  const setUser = useAppStore((state) => state.setUser);
  const setTenantId = useAppStore((state) => state.setTenantId);
  const setAccessToken = useAppStore((state) => state.setAccessToken);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        if (!res.ok) throw new Error(data?.error?.message || data?.message || "Registration failed");
        const payload = data.data;
        const user = payload.user;
        setUser(user);
        setTenantId(user.organizationId);
        setAccessToken(payload.accessToken);
        navigate({ to: "/onboarding" });
      } catch (err: any) {
        setSubmitError(err.message || "Registration failed");
      }
    },
  });

  return (
    <div className="min-h-[100dvh] bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 border-r border-outline-variant bg-surface-container-low p-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <Ticket className="w-4 h-4 text-on-primary" />
          </div>
          <span className="font-semibold text-on-surface tracking-tight">Alpis</span>
        </Link>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-2xl font-bold text-on-surface tracking-tight mb-2">
              Your service desk,<br />up in minutes.
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              No infrastructure to manage. No per-ticket pricing. Just a professional
              help desk that scales with your team.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                <div className="w-5 h-5 rounded-full bg-secondary/15 border border-secondary/25 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-secondary" />
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-on-surface-variant/40">Alpis Enterprise Service Desk</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-7">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Ticket className="w-3.5 h-3.5 text-on-primary" />
            </div>
            <span className="font-semibold text-on-surface text-sm">Alpis</span>
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">
              Create your account
            </h1>
            <p className="text-sm text-on-surface-variant">
              Set up your organization in under 2 minutes.
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
                validators={{ onChange: z.string().min(1, "Required") }}
                children={(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>First name</Label>
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
                validators={{ onChange: z.string().min(1, "Required") }}
                children={(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Last name</Label>
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
                  <Label htmlFor={field.name}>Organization name</Label>
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
              validators={{ onChange: z.string().min(8) }}
              children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${field.name}-input`}>Password</Label>
                  <Input
                    id={`${field.name}-input`}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="8+ characters"
                  />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )}
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" fullWidth disabled={!canSubmit} loading={isSubmitting}>
                  Create account <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            />

            <p className="text-[11px] text-on-surface-variant/50 text-center leading-relaxed">
              By creating an account you agree to our{" "}
              <Link to="/terms" className="text-primary/70 hover:text-primary">Terms of Service</Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-primary/70 hover:text-primary">Privacy Policy</Link>.
            </p>
          </form>

          <p className="text-xs text-center text-on-surface-variant">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
