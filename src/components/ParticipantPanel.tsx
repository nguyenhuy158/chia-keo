import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiParticipant } from "../../shared/api-types";
import type { ParticipantInput } from "../../shared/schemas";
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
  onUpdate: (participantId: string, input: Partial<ParticipantInput>) => Promise<unknown>;
  onRemove: (participantId: string) => void;
};

export function ParticipantPanel({
  participants,
  pending,
  onAdd,
  onUpdate,
  onRemove,
}: ParticipantPanelProps) {
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: emptyForm,
  });

  const handleAdd = form.handleSubmit(async (values) => {
    await onAdd(values);
    form.reset(emptyForm);
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

    await onUpdate(editingParticipantId, values);
    cancelEdit();
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center gap-2">
        <Users size={18} className="text-violet-600 dark:text-violet-400" />
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Người tham gia</h3>
      </div>

      <form onSubmit={editingParticipantId ? handleSaveEdit : handleAdd} className="grid gap-3 md:grid-cols-2">
        <Field label="Tên" error={form.formState.errors.name?.message}>
          <input {...form.register("name")} className="field" placeholder="Huy" />
        </Field>
        <Field label="Mã ngân hàng">
          <input {...form.register("bankId")} className="field" placeholder="VCB, TCB, MBB..." />
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

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="rounded-md border border-stone-200 p-3 dark:border-stone-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                  {participant.name}
                </p>
                <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-400">
                  {participant.bankId && participant.accountNo
                    ? `${participant.bankId} - ${participant.accountNo}`
                    : "Chưa có thông tin QR"}
                </p>
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
                  onClick={() => onRemove(participant.id)}
                  disabled={pending}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 active:bg-rose-100 disabled:cursor-not-allowed disabled:text-rose-300 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
                  aria-label={`Xóa ${participant.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
