import { forwardRef } from "react";

type InputProps = {
  dense?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ dense, className, ...props }, ref) => (
    <input
      ref={ref}
      className={[
        "w-full border border-outline-variant rounded-lg text-on-surface",
        "placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2",
        "focus:ring-primary/50 focus:border-primary/60 transition-colors",
        dense
          ? "px-3 py-2 bg-surface-container-high text-sm"
          : "px-3.5 py-2.5 bg-surface-container text-sm",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  ),
);
Input.displayName = "Input";
