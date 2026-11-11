import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Link } from "@/lib/router";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ok"
  | "danger"
  | "dangerOutline"
  | "ghost"
  | "inverse"
  | "outlineInverse";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-paper",
  ok: "bg-ok-strong text-white hover:bg-ok-ink",
  danger: "bg-danger-strong text-white hover:bg-danger-ink",
  dangerOutline: "border border-danger bg-surface text-danger-ink hover:bg-danger-soft",
  ghost: "text-brand hover:bg-brand-soft",
  inverse: "bg-white text-ink hover:bg-paper",
  outlineInverse: "border border-white/50 text-white hover:bg-white/10",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-12 px-4 text-[15px]",
  lg: "h-14 px-5 text-base",
};

type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconName;
};

function buttonClass(
  { variant = "primary", size = "md", block }: ButtonStyleProps,
  extra?: string,
): string {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], block && "w-full", extra);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps;

export function Button({
  variant,
  size,
  block,
  icon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, block }, className)} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 20} />}
      {children}
    </button>
  );
}

type ButtonLinkProps = ButtonStyleProps & { to: string; className?: string; children: ReactNode };

export function ButtonLink({
  to,
  variant,
  size,
  block,
  icon,
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link to={to} className={buttonClass({ variant, size, block }, className)}>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 20} />}
      {children}
    </Link>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
};

export function Field({ label, htmlFor, error, hint, optional, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink"
      >
        {label}
        {optional && <span className="text-xs font-normal text-ink-muted">Opcional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-sm text-danger-ink">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  "w-full rounded-lg border bg-surface px-3 text-base text-ink placeholder:text-ink-muted/60 transition-colors duration-150 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-paper disabled:text-ink-muted";

function controlClass(invalid?: boolean, extra?: string): string {
  return cx(CONTROL_BASE, invalid ? "border-danger" : "border-line-strong", extra);
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; mono?: boolean };

export function TextInput({ invalid, mono, className, ...rest }: TextInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cx("h-12", mono && "font-mono", className))}
      {...rest}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export function Select({ invalid, className, children, ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cx("h-12", className))}
      {...rest}
    >
      {children}
    </select>
  );
}

type TimeSelectProps = Omit<SelectProps, "children" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  stepMinutes?: number;
};

export function TimeSelect({
  value,
  onChange,
  stepMinutes = 30,
  className,
  ...rest
}: TimeSelectProps) {
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    options.push(
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    );
  }
  if (value && !options.includes(value)) options.push(value);
  return (
    <Select
      value={value}
      className={cx("font-mono", className)}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    >
      {options.sort().map((option) => (
        <option key={option} value={option}>
          {option.replace(":", "h")}
        </option>
      ))}
    </Select>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export function TextArea({ invalid, className, ...rest }: TextAreaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={controlClass(invalid, cx("min-h-28 py-3", className))}
      {...rest}
    />
  );
}

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id: string;
};

export function Toggle({ checked, onChange, label, description, id }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-[15px] font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150",
          checked ? "border-brand bg-brand" : "border-line-strong bg-sunken",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 left-0.5 size-[22px] rounded-full bg-white transition-transform duration-150",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
