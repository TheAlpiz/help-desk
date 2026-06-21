import { forwardRef } from "react";
import { Spinner } from "./Spinner";

const variantCls = {
  primary:
    "bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary/50 focus:ring-offset-background disabled:opacity-40",
  secondary:
    "border border-outline-variant text-on-surface-variant hover:bg-white/5 focus:ring-outline-variant disabled:opacity-40",
  danger:
    "bg-error-container text-error hover:bg-error-container/80 focus:ring-error/50 disabled:opacity-50",
  ghost:
    "text-on-surface-variant hover:text-on-surface focus:ring-outline-variant disabled:opacity-40",
} as const;

type ButtonProps = {
  variant?: keyof typeof variantCls;
  loading?: boolean;
  fullWidth?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "transition-colors active:scale-[0.99] disabled:cursor-not-allowed",
        variantCls[variant],
        fullWidth ? "w-full py-2.5 px-4" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  ),
);
Button.displayName = "Button";
