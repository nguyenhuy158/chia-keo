import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: ReactNode;
  description?: ReactNode;
};

/** Mot lua chon don. Nhieu Radio cung `name` thi trinh duyet tu gom thanh nhom. */
export function Radio({ label, description, className, disabled, ...rest }: RadioProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-start gap-3 py-2",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input type="radio" disabled={disabled} className="peer sr-only" {...rest} />

      <span
        aria-hidden="true"
        className={cn(
          // Cham giua dung bg-current: chi hien khi o ngoai doi sang mau primary.
          // Bien the peer khong ap duoc cho con chau nen khong dat tren cham.
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border bg-surface text-transparent transition",
          "peer-checked:border-primary peer-checked:text-primary",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
        )}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-current transition" />
      </span>

      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm text-fg">{label}</span>}
          {description && (
            <span className="mt-0.5 block text-xs text-fg-muted">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}

export type RadioGroupProps = {
  label: string;
  /** Dung chung cho moi Radio ben trong, nen dat duy nhat trong mot form. */
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }[];
  error?: string;
  className?: string;
};

/** Nhom radio co san label + thong bao loi, dung khi khong muon tu noi tay. */
export function RadioGroup({
  label,
  name,
  value,
  onChange,
  options,
  error,
  className,
}: RadioGroupProps) {
  return (
    <fieldset className={cn("min-w-0 border-0 p-0", className)}>
      <legend className="mb-1 text-sm font-medium text-fg">{label}</legend>
      <div className="flex flex-col">
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            label={option.label}
            description={option.description}
            onChange={() => onChange(option.value)}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
