type FormErrorProps = { children?: React.ReactNode; className?: string };

export function FormError({ children, className }: FormErrorProps) {
  if (!children) return null;
  return (
    <p className={`text-xs text-error ${className ?? ""}`}>{children}</p>
  );
}

type FormAlertProps = { children?: React.ReactNode; className?: string };

export function FormAlert({ children, className }: FormAlertProps) {
  if (!children) return null;
  return (
    <div
      className={`p-3 bg-error-container/20 border border-error/20 rounded-lg text-xs text-error ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
