import { CircleCheckBig, QrCode } from "lucide-react";
import { useState } from "react";
import type { ApiParticipant, ApiPaymentRequest } from "../../shared/api-types";
import {
  useCreatePayment,
  usePaymentOptions,
  usePaymentRequest,
} from "../adapters/react-query/queries";
import { getQrProvider } from "../core/container";
import { formatMoney } from "../core/domain/money";
import { BottomSheet } from "./overlays";

type SharePaymentPanelProps = {
  token: string;
  participants: ApiParticipant[];
};

function PaymentStatus({ payment }: { payment: ApiPaymentRequest }) {
  if (payment.status === "paid") {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CircleCheckBig
          size={40}
          className="text-emerald-600 dark:text-emerald-400"
        />
        <p className="text-base font-semibold">
          Đã nhận {formatMoney(payment.paidAmount)}
        </p>
        <p className="text-sm text-fg-muted">
          Các khoản nợ đã được đánh dấu là đã trả.
        </p>
      </div>
    );
  }

  const remaining = payment.total - payment.paidAmount;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <img
        src={getQrProvider().buildUrl(
          payment.receiver,
          remaining,
          payment.code,
        )}
        alt={`QR chuyển ${formatMoney(remaining)} cho ${payment.receiver.name}`}
        className="h-56 w-56 rounded-md bg-white object-contain"
      />
      {payment.paidAmount > 0 && (
        <p role="alert" className="rounded-md bg-warning-soft p-2 text-sm">
          Đã nhận {formatMoney(payment.paidAmount)}, chuyển thêm phần còn thiếu
          với cùng nội dung.
        </p>
      )}
      <p className="text-lg font-semibold tabular">{formatMoney(remaining)}</p>
      <p className="text-sm">
        Nội dung:{" "}
        <span className="font-mono font-semibold">{payment.code}</span>
      </p>
      <p className="text-xs text-fg-muted">
        Giữ nguyên nội dung khi chuyển. Đang chờ tiền về…
      </p>
    </div>
  );
}

function PaymentTracker({ token, code }: { token: string; code: string }) {
  const paymentQuery = usePaymentRequest(token, code);
  if (!paymentQuery.data)
    return <p className="py-6 text-center text-sm text-fg-muted">Đang tải…</p>;
  return <PaymentStatus payment={paymentQuery.data} />;
}

export function SharePaymentPanel({
  token,
  participants,
}: SharePaymentPanelProps) {
  const optionsQuery = usePaymentOptions(token);
  const createPayment = useCreatePayment(token);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [code, setCode] = useState("");

  const receiver = optionsQuery.data?.receiver;
  const options = optionsQuery.data?.options || [];
  if (!receiver || options.length === 0) return null;

  const nameById = new Map(
    participants.map((person) => [person.id, person.name]),
  );
  const total = options
    .filter((option) => selected.includes(option.participantId))
    .reduce((sum, option) => sum + option.amount, 0);

  function toggle(participantId: string) {
    setSelected((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId],
    );
  }

  function close() {
    setOpen(false);
    setSelected([]);
    setCode("");
  }

  async function submit() {
    const payment = await createPayment.mutateAsync(selected);
    setCode(payment.code);
  }

  return (
    <section className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="min-w-0">
        <h3 className="text-base font-semibold">
          Chuyển khoản cho {receiver.name}
        </h3>
        <p className="text-sm text-fg-muted">
          Quét QR, app tự ghi nhận khi tiền về.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white"
      >
        <QrCode size={17} />
        Thanh toán
      </button>

      <BottomSheet open={open} onClose={close} title="Thanh toán">
        {code ? (
          <div className="pb-4">
            <PaymentTracker token={token} code={code} />
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            <p className="text-sm text-fg-muted">Bạn trả cho những ai?</p>
            <div className="space-y-2">
              {options.map((option) => (
                <label
                  key={option.participantId}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={selected.includes(option.participantId)}
                      onChange={() => toggle(option.participantId)}
                    />
                    {nameById.get(option.participantId) || "Không rõ"}
                  </span>
                  <span className="text-sm font-semibold tabular">
                    {formatMoney(option.amount)}
                  </span>
                </label>
              ))}
            </div>
            {createPayment.isError && (
              <p role="alert" className="text-sm text-danger">
                Không tạo được mã thanh toán, thử lại nhé.
              </p>
            )}
            <button
              type="button"
              disabled={selected.length === 0 || createPayment.isPending}
              onClick={submit}
              className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-white disabled:opacity-50"
            >
              {selected.length === 0
                ? "Chọn ít nhất một người"
                : `Tạo QR ${formatMoney(total)}`}
            </button>
          </div>
        )}
      </BottomSheet>
    </section>
  );
}
