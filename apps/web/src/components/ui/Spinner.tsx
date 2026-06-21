type SpinnerProps = { className?: string };

export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      className={`inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin ${className ?? ""}`}
    />
  );
}
