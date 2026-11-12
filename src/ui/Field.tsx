import { useId, type ReactElement, cloneElement } from "react";
import { cn } from "./cn";

export type FieldProps = {
  label: string;
  /** Chu giai thich duoi o nhap. Bi thay bang `error` khi co loi. */
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Mot control duy nhat: Input, Textarea, Select... */
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    invalid?: boolean;
    required?: boolean;
  }>;
};

/**
 * Boc label + hint + loi quanh mot control, tu noi id/aria-describedby.
 * Nho vay screen reader doc duoc loi ma khong phai tu dat id o moi form.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = children.props.id ?? autoId;
  const messageId = `${id}-msg`;
  const message = error ?? hint;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>

      {cloneElement(children, {
        id,
        required,
        invalid: Boolean(error),
        "aria-describedby": message ? messageId : undefined,
      })}

      {message && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("text-xs", error ? "text-danger" : "text-fg-muted")}
        >
          {message}
        </p>
      )}
    </div>
  );
}
