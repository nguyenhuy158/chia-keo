import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { ApiParticipant } from "../../shared/api-types";
import type { ParticipantInput } from "../../shared/schemas";
import { getVietQrBankLabel } from "../adapters/browser/vietqr";
import { Avatar } from "./Avatar";
import { BankSelect } from "./BankSelect";
import { useConfirm } from "./ConfirmDialog";
import { ContactPicker } from "./ContactPicker";
import { SwipeToDelete } from "./SwipeToDelete";
import { Field } from "./ui";

const participantFormSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên người tham gia"),
  bankId: z.string().trim(),
  accountNo: z.string().trim(),
  accountName: z.string().trim(),
});

type ParticipantFormValues = z.infer<typeof participantFormSchema>;

const emptyForm: ParticipantFormValues = {
  name: "",
  bankId: "",
  accountNo: "",
  accountName: "",
};

type ParticipantPanelProps = {
  participants: ApiParticipant[];
  pending: boolean;
  onAdd: (input: ParticipantInput) => Promise<unknown>;
  onAddMany: (people: ParticipantInput[]) => Promise<unknown>;
  onUpdate: (participantId: string, input: Partial<ParticipantInput>) => Promise<unknown>;
  onRemove: (participantId: string) => void;
  onReorder: (participantIds: string[]) => void;
};

export function ParticipantPanel({
  participants,
  pending,
  onAdd,
  onAddMany,
  onUpdate,
  onRemove,
  onReorder,
}: ParticipantPanelProps) {
  const confirm = useConfirm();
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: emptyForm,
  });

  /**
   * Xoa nguoi cascade that (chia lai phan cac khoan chi khac) va khong nam
   * trong Lich su/hoan tac, khac voi xoa khoan chi — nen phai hoi truoc, dung
   * chung cho ca nut icon lan SwipeToDelete de khong co duong nao lot luoi.
   */
  async function handleRemove(participant: ApiParticipant) {
    const ok = await confirm({
      title: `Xóa ${participant.name} khỏi cuộc chơi?`,
      description: "Các khoản chi đã chia cho người này sẽ được chia lại cho những người còn lại.",
      confirmLabel: "Xóa",
      destructive: true,
    });
    if (!ok) return;

    onRemove(participant.id);
    toast.success(`Đã xóa ${participant.name}`);
  }

  /** Doi cho voi nguoi ngay tren/duoi trong danh sach hien tai. */
  function move(participantId: string, direction: -1 | 1) {
    const index = participants.findIndex((participant) => participant.id === participantId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= participants.length) return;

    const order = participants.map((participant) => participant.id);
    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    onReorder(order);
  }

  const handleAdd = form.handleSubmit(async (values) => {
    try {
      await onAdd(values);
      form.reset(emptyForm);
      toast.success("Đã thêm người tham gia");
    } catch {
      toast.error("Không lưu được");
    }
  });

  function startEdit(participant: ApiParticipant) {
    setEditingParticipantId(participant.id);
    form.reset({
      name: participant.name,
      bankId: participant.bankId,
      accountNo: participant.accountNo,
      accountName: participant.accountName,
    });
  }

  function cancelEdit() {
    setEditingParticipantId(null);
    form.reset(emptyForm);
  }

  const handleSaveEdit = form.handleSubmit(async (values) => {
    if (!editingParticipantId) return;

    try {
      await onUpdate(editingParticipantId, values);
      cancelEdit();
      toast.success("Đã lưu thông tin");
    } catch {
      toast.error("Không lưu được");
    }
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center gap-2">
        <Users size={18} className="text-violet-600 dark:text-violet-400" />
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Người tham gia</h3>
      </div>

      {/* Chi hien luc them nguoi moi: dang sua mot nguoi thi form o duoi la trong tam. */}
      {!editingParticipantId && (
        <ContactPicker participants={participants} pending={pending} onAddMany={onAddMany} />
      )}

      <form onSubmit={editingParticipantId ? handleSaveEdit : handleAdd} className="grid gap-3 md:grid-cols-2">
        <Field label="Tên" error={form.formState.errors.name?.message}>
          <input {...form.register("name")} className="field" placeholder="Huy" />
        </Field>
        <Field label="Ngân hàng">
          <BankSelect
            value={form.watch("bankId")}
            onChange={(bankId) => form.setValue("bankId", bankId)}
          />
        </Field>
        <Field label="Số tài khoản">
          <input {...form.register("accountNo")} className="field" placeholder="0123456789" />
        </Field>
        <Field label="Tên chủ tài khoản">
          <input {...form.register("accountName")} className="field" placeholder="NGUYEN VAN A" />
        </Field>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700 sm:w-auto"
          >
            {editingParticipantId ? <Check size={17} /> : <Plus size={17} />}
            {editingParticipantId ? "Lưu thông tin" : "Thêm người"}
          </button>
          {editingParticipantId && (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={pending}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800 sm:ml-2 sm:mt-0 sm:w-auto"
            >
              <X size={17} />
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {participants.map((participant, index) => (
          <div key={participant.id}>
            <SwipeToDelete onDelete={() => handleRemove(participant)}>
              <div className="rounded-md border border-stone-200 p-3 dark:border-stone-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1">
                    <div className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        onClick={() => move(participant.id, -1)}
                        disabled={pending || index === 0}
                        className="flex h-5 w-6 items-center justify-center text-stone-400 transition hover:text-stone-700 disabled:opacity-30 dark:text-stone-600 dark:hover:text-stone-200"
                        aria-label={`Đưa ${participant.name} lên`}
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(participant.id, 1)}
                        disabled={pending || index === participants.length - 1}
                        className="flex h-5 w-6 items-center justify-center text-stone-400 transition hover:text-stone-700 disabled:opacity-30 dark:text-stone-600 dark:hover:text-stone-200"
                        aria-label={`Đưa ${participant.name} xuống`}
                      >
                        <ChevronDown size={15} />
                      </button>
                    </div>
                    <Avatar name={participant.name} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                        {participant.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-400">
                        {participant.bankId && participant.accountNo
                          ? `${getVietQrBankLabel(participant.bankId)} · ${participant.accountNo}`
                          : "Chưa có thông tin QR"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(participant)}
                      disabled={pending}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-stone-600 transition hover:bg-stone-50 active:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300 dark:text-stone-300 dark:hover:bg-stone-800 dark:active:bg-stone-700"
                      aria-label={`Sửa ${participant.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(participant)}
                      disabled={pending}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 active:bg-rose-100 disabled:cursor-not-allowed disabled:text-rose-300 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
                      aria-label={`Xóa ${participant.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </SwipeToDelete>
          </div>
        ))}
      </div>
    </section>
  );
}
