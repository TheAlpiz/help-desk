interface AppLogoProps {
  variant?: "color" | "mono" | "stacked";
  className?: string;
}

export function AppLogo({ variant = "color", className = "h-7 w-auto" }: AppLogoProps) {
  const lightSrc =
    variant === "mono"
      ? "/logo-mono.svg"
      : variant === "stacked"
        ? "/logo-stacked.svg"
        : "/logo.svg";

  const darkSrc =
    variant === "mono"
      ? "/logo-mono-dark.svg"
      : variant === "stacked"
        ? "/logo-stacked-dark.svg"
        : "/logo-dark.svg";

  return (
    <>
      <img src={lightSrc} alt="Alpis Help Desk" className={`${className} dark:hidden`} />
      <img src={darkSrc} alt="Alpis Help Desk" className={`${className} hidden dark:block`} />
    </>
  );
}
