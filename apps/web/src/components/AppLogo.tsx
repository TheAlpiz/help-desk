interface AppLogoProps {
  variant?: "color" | "mono" | "stacked";
  className?: string;
}

export function AppLogo({ variant = "color", className = "h-7 w-auto" }: AppLogoProps) {
  const src =
    variant === "mono"
      ? "/logo-mono.svg"
      : variant === "stacked"
        ? "/logo-stacked.svg"
        : "/logo.svg";
  return <img src={src} alt="Alpis Help Desk" className={className} />;
}
