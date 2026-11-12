import { cn } from "./cn";

export type Step = {
  id: string;
  label: string;
  description?: string;
};

export type StepperProps = {
  steps: Step[];
  /** Vi tri buoc dang lam, tinh tu 0. */
  current: number;
  /** Cho bam quay lai buoc da xong. Bo trong thi chi hien thi, khong bam duoc. */
  onStepClick?: (index: number) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
};

export function Stepper({
  steps,
  current,
  onStepClick,
  orientation = "horizontal",
  className,
}: StepperProps) {
  return (
    <ol
      className={cn(
        orientation === "horizontal" ? "flex items-start" : "flex flex-col gap-1",
        className,
      )}
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        // Chi cho quay lai buoc da xong: nhay toi buoc chua lam thuong bo qua
        // buoc kiem tra du lieu o giua.
        const clickable = Boolean(onStepClick) && done;

        const bubble = (
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition",
              done && "border-primary bg-primary text-primary-fg",
              active && "border-primary text-primary",
              !done && !active && "border-border text-fg-muted",
            )}
          >
            {done ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              index + 1
            )}
          </span>
        );

        const text = (
          <span className={cn(orientation === "horizontal" ? "mt-1.5 block text-center" : "block")}>
            <span
              className={cn(
                "block text-xs font-medium",
                active ? "text-fg" : "text-fg-muted",
              )}
            >
              {step.label}
            </span>
            {step.description && (
              <span className="mt-0.5 block text-[11px] text-fg-muted">{step.description}</span>
            )}
          </span>
        );

        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={cn(
              orientation === "horizontal"
                ? "flex flex-1 flex-col items-center"
                : "flex items-start gap-3",
            )}
          >
            {orientation === "horizontal" ? (
              <>
                <div className="flex w-full items-center">
                  {/* Nua duong noi ben trai: giau o buoc dau cho khoi thua. */}
                  <span
                    className={cn(
                      "h-px flex-1",
                      index === 0 ? "bg-transparent" : done || active ? "bg-primary" : "bg-border",
                    )}
                  />
                  {clickable ? (
                    <button type="button" onClick={() => onStepClick!(index)} className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
                      {bubble}
                    </button>
                  ) : (
                    bubble
                  )}
                  <span
                    className={cn(
                      "h-px flex-1",
                      index === steps.length - 1 ? "bg-transparent" : done ? "bg-primary" : "bg-border",
                    )}
                  />
                </div>
                {text}
              </>
            ) : (
              <>
                <div className="flex flex-col items-center self-stretch">
                  {clickable ? (
                    <button type="button" onClick={() => onStepClick!(index)} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {bubble}
                    </button>
                  ) : (
                    bubble
                  )}
                  {index < steps.length - 1 && (
                    <span className={cn("w-px flex-1 py-1", done ? "bg-primary" : "bg-border")} />
                  )}
                </div>
                <span className="pb-4 pt-1.5">{text}</span>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
