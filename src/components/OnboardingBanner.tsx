import { Check, Users, Wallet, QrCode } from "lucide-react";

type Step = { label: string; done: boolean };

type OnboardingBannerProps = {
  participantCount: number;
  expenseCount: number;
};

/**
 * Huong dan 3 buoc cho cuoc choi vua tao, con trong trong. Tu bien mat khi da
 * co it nhat 1 nguoi + 1 khoan chi — luc do cac panel da co du lieu that de
 * tu no giai thich, khong can huong dan nua.
 */
export function OnboardingBanner({ participantCount, expenseCount }: OnboardingBannerProps) {
  const hasParticipant = participantCount > 0;
  const hasExpense = expenseCount > 0;

  if (hasParticipant && hasExpense) return null;

  const steps: Step[] = [
    { label: "Thêm người", done: hasParticipant },
    { label: "Thêm khoản chi", done: hasExpense },
    { label: "Xem tổng kết", done: false },
  ];
  const icons = [Users, Wallet, QrCode];

  return (
    <div className="mb-5 rounded-lg border border-dashed border-violet-300 bg-violet-50/60 p-4 dark:border-violet-500/40 dark:bg-violet-500/10">
      <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
        Cuộc chơi mới toanh — bắt đầu từ đây
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {steps.map((step, index) => {
          const Icon = icons[index];
          return (
            <div key={step.label} className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium ${
                  step.done
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-white text-violet-800 shadow-sm dark:bg-stone-900 dark:text-violet-200"
                }`}
              >
                {step.done ? <Check size={14} /> : <Icon size={14} />}
                {index + 1}. {step.label}
              </span>
              {index < steps.length - 1 && (
                <span className="text-violet-300 dark:text-violet-700">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
