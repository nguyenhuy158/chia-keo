import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiExpense, ApiParticipant } from "../../shared/api-types";
import { DEFAULT_EXPENSE_TITLE, type ExpenseInput } from "../../shared/schemas";
import { formatMoney, parseMoney } from "../lib/money";
import { Field } from "./ui";

const expenseFormSchema = z.object({
  title: z.string().trim(),
  amount: z.string().refine((value) => parseMoney(value) > 0, "Nhap so tien hop le"),
  payerId: z.string().min(1, "Chon nguoi tra"),
  splitParticipantIds: z.array(z.string()).min(1, "Chon it nhat mot nguoi cung chia"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

type ExpensePanelProps = {
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  pending: boolean;
  onAdd: (input: ExpenseInput) => Promise<unknown>;
  onRemove: (expenseId: string) => void;
};

export function ExpensePanel({
  participants,
  expenses,
  pending,
  onAdd,
  onRemove,
}: ExpensePanelProps) {
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: "",
      amount: "",
      payerId: participants[0]?.id || "",
      splitParticipantIds: participants.map((participant) => participant.id),
    },
  });

  const splitParticipantIds = form.watch("splitParticipantIds");
  const payerId = form.watch("payerId");

  // Dong bo form khi danh sach nguoi tham gia thay doi: nguoi moi duoc tu dong
  // them vao danh sach chia, nguoi bi xoa duoc go khoi form.
  const knownParticipantIdsRef = useRef(new Set(participants.map((p) => p.id)));
  useEffect(() => {
    const currentIds = new Set(participants.map((participant) => participant.id));
    const knownIds = knownParticipantIdsRef.current;
    const addedIds = participants
      .map((participant) => participant.id)
      .filter((id) => !knownIds.has(id));
    knownParticipantIdsRef.current = currentIds;

    const values = form.getValues();
    const nextSplitIds = [
      ...values.splitParticipantIds.filter((id) => currentIds.has(id)),
      ...addedIds,
    ];
    if (
      nextSplitIds.length !== values.splitParticipantIds.length ||
      nextSplitIds.some((id, index) => id !== values.splitParticipantIds[index])
    ) {
      form.setValue("splitParticipantIds", nextSplitIds);
    }

    if (!currentIds.has(values.payerId)) {
      form.setValue("payerId", participants[0]?.id || "");
    }
  }, [participants, form]);

  function toggleSplit(participantId: string) {
    const isSelected = splitParticipantIds.includes(participantId);
    form.setValue(
      "splitParticipantIds",
      isSelected
        ? splitParticipantIds.filter((id) => id !== participantId)
        : [...splitParticipantIds, participantId],
      { shouldValidate: form.formState.isSubmitted },
    );
  }

  const handleAdd = form.handleSubmit(async (values) => {
    await onAdd({
      title: values.title || DEFAULT_EXPENSE_TITLE,
      amount: parseMoney(values.amount),
      note: "",
      payerParticipantId: values.payerId,
      splitParticipantIds: values.splitParticipantIds,
    });
    form.reset({
      title: "",
      amount: "",
      payerId: values.payerId,
      splitParticipantIds: values.splitParticipantIds,
    });
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Banknote size={18} className="text-blue-700" />
        <h3 className="text-lg font-semibold text-stone-950">Khoan chi</h3>
      </div>

      <form onSubmit={handleAdd} className="grid gap-3 md:grid-cols-2">
        <Field label="Noi dung">
          <input {...form.register("title")} className="field" placeholder="An toi" />
        </Field>
        <Field label="So tien" error={form.formState.errors.amount?.message}>
          <input
            {...form.register("amount")}
            className="field"
            inputMode="numeric"
            placeholder="500000"
          />
        </Field>
        <Field label="Nguoi tra" error={form.formState.errors.payerId?.message}>
          <select {...form.register("payerId")} value={payerId} className="field">
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">Chia cho ai</p>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => {
              const checked = splitParticipantIds.includes(participant.id);
              return (
                <button
                  key={participant.id}
                  type="button"
                  onClick={() => toggleSplit(participant.id)}
                  className={`h-9 rounded-md border px-3 text-sm font-medium transition ${
                    checked
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {participant.name}
                </button>
              );
            })}
          </div>
          {form.formState.errors.splitParticipantIds && (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.splitParticipantIds.message}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={participants.length === 0 || pending}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            <Plus size={17} />
            Them khoan chi
          </button>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {expenses.map((expense) => {
          const payer = participantById.get(expense.payerParticipantId);
          return (
            <div key={expense.id} className="rounded-md border border-stone-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{expense.title}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {payer?.name || "Khong ro"} tra, chia {expense.splitParticipantIds.length} nguoi
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-stone-950">
                    {formatMoney(expense.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(expense.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50"
                    aria-label={`Xoa ${expense.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
