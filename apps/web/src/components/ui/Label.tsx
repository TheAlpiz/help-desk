type LabelProps = { required?: boolean } & React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ required, className, children, ...props }: LabelProps) {
  return (
    <label
      className={`text-sm font-medium text-on-surface ${className ?? ""}`}
      {...props}
    >
      {children}
      {required && <span className="text-error ml-0.5">*</span>}
    </label>
  );
}
