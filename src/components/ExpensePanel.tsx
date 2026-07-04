import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Check, ImagePlus, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import type { ResolvedAiExpense } from "../../shared/ai";
import type { ApiExpense, ApiParticipant } from "../../shared/api-types";
import { DEFAULT_EXPENSE_TITLE, type ExpenseInput } from "../../shared/schemas";
import { formatMoney, parseMoney } from "../lib/money";
import { useAiScanReceipt, useAiSuggestExpense } from "../lib/queries";
import { MoneyInput } from "./MoneyInput";
import { Field } from "./ui";

const expenseFormSchema = z.object({
  title: z.string().trim(),
  amount: z.string().refine((value) => parseMoney(value) > 0, "Nhap so tien hop le"),
  payerId: z.string().min(1, "Chon nguoi tra"),
  splitParticipantIds: z.array(z.string()).min(1, "Chon it nhat mot nguoi cung chia"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

type ExpensePanelProps = {
  gameId: string;
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  pending: boolean;
  onAdd: (input: ExpenseInput) => Promise<unknown>;
  onUpdate: (expenseId: string, input: Partial<ExpenseInput>) => Promise<unknown>;
  onRemove: (expenseId: string) => void;
};

const AI_ERROR_MESSAGES: Record<string, string> = {
  gemini_not_configured: "Server chua cau hinh GEMINI_API_KEY nen chua dung duoc AI.",
  gemini_invalid_response: "AI tra du lieu khong hop le, thu lai voi cau ro hon.",
  gemini_request_failed: "Goi AI that bai, thu lai sau.",
};

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ExpensePanel({
  gameId,
  participants,
  expenses,
  pending,
  onAdd,
  onUpdate,
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

  function setAllSplit(selectAll: boolean) {
    form.setValue(
      "splitParticipantIds",
      selectAll ? participants.map((participant) => participant.id) : [],
      { shouldValidate: form.formState.isSubmitted },
    );
  }

  const allSelected =
    participants.length > 0 && splitParticipantIds.length === participants.length;

  const aiSuggest = useAiSuggestExpense(gameId);
  const aiReceipt = useAiScanReceipt(gameId);
  const [aiText, setAiText] = useState("");
  const [aiError, setAiError] = useState("");
  const aiPending = aiSuggest.isPending || aiReceipt.isPending;

  function applyAiSuggestion(suggestion: ResolvedAiExpense) {
    if (suggestion.title) form.setValue("title", suggestion.title);
    if (suggestion.amount > 0) form.setValue("amount", String(suggestion.amount));
    if (suggestion.payerParticipantId) form.setValue("payerId", suggestion.payerParticipantId);
    if (suggestion.splitParticipantIds.length > 0) {
      form.setValue("splitParticipantIds", suggestion.splitParticipantIds);
    }
  }

  function toAiErrorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "";
    return AI_ERROR_MESSAGES[code] || "Goi AI that bai, thu lai sau.";
  }

  async function handleAiSuggest() {
    const text = aiText.trim();
    if (!text || aiPending) return;

    setAiError("");
    try {
      const { suggestion } = await aiSuggest.mutateAsync(text);
      applyAiSuggestion(suggestion);
      setAiText("");
    } catch (error) {
      setAiError(toAiErrorMessage(error));
    }
  }

  async function handleAiReceipt(file: File | undefined) {
    if (!file || aiPending) return;

    setAiError("");
    try {
      const data = await readFileAsBase64(file);
      const { suggestion } = await aiReceipt.mutateAsync({ mimeType: file.type, data });
      applyAiSuggestion(suggestion);
    } catch (error) {
      setAiError(toAiErrorMessage(error));
    }
  }

  const [editingExpenseId, setEditingExpenseId] = useState("");

  function startEditExpense(expense: ApiExpense) {
    setEditingExpenseId(expense.id);
    form.reset({
      title: expense.title,
      amount: String(expense.amount),
      payerId: expense.payerParticipantId,
      splitParticipantIds: expense.splitParticipantIds,
    });
  }

  function cancelEditExpense() {
    setEditingExpenseId("");
    form.reset({
      title: "",
      amount: "",
      payerId: participants[0]?.id || "",
      splitParticipantIds: participants.map((participant) => participant.id),
    });
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const input = {
      title: values.title || DEFAULT_EXPENSE_TITLE,
      amount: parseMoney(values.amount),
      note: "",
      payerParticipantId: values.payerId,
      splitParticipantIds: values.splitParticipantIds,
    };

    if (editingExpenseId) {
      await onUpdate(editingExpenseId, input);
      setEditingExpenseId("");
    } else {
      await onAdd(input);
    }
    form.reset({
      title: "",
      amount: "",
      payerId: values.payerId,
      splitParticipantIds: values.splitParticipantIds,
    });
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center gap-2">
        <Banknote size={18} className="text-amber-500" />
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Khoan chi</h3>
      </div>

      <div className="mb-4 rounded-md border border-violet-200 bg-violet-50 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
        <div className="flex items-center gap-2 text-sm font-medium text-violet-800 dark:text-violet-300">
          <Sparkles size={15} />
          Nhap nhanh bang AI
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={aiText}
            onChange={(event) => setAiText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAiSuggest();
              }
            }}
            className="field w-full flex-1 bg-white sm:w-auto"
            placeholder="Vi du: an toi 500k Huy tra chia 3"
            disabled={participants.length === 0}
          />
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={aiPending || participants.length === 0}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-violet-700 px-3 text-sm font-semibold text-white transition hover:bg-violet-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700 sm:h-10"
          >
            <Sparkles size={15} />
            {aiSuggest.isPending ? "Dang doc..." : "Goi y"}
          </button>
          <label
            className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-violet-300 bg-white px-3 text-sm font-medium text-violet-800 transition hover:bg-violet-100 dark:border-violet-500/40 dark:bg-stone-800 dark:text-violet-300 dark:hover:bg-stone-700 sm:h-10 ${
              aiPending || participants.length === 0 ? "pointer-events-none opacity-50" : ""
            }`}
            title="Quet anh hoa don"
          >
            <ImagePlus size={15} />
            {aiReceipt.isPending ? "Dang quet..." : "Hoa don"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                handleAiReceipt(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {aiError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{aiError}</p>}
        <p className="mt-2 text-xs text-violet-700 dark:text-violet-300/80">
          AI dien san form ben duoi, kiem tra lai truoc khi them.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <Field label="Noi dung">
          <input {...form.register("title")} className="field" placeholder="An toi" />
        </Field>
        <Field label="So tien" error={form.formState.errors.amount?.message}>
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <MoneyInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="500.000"
              />
            )}
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Chia cho ai</p>
            {participants.length > 1 && (
              <button
                type="button"
                onClick={() => setAllSplit(!allSelected)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 active:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-500/10 dark:active:bg-violet-500/20"
              >
                {allSelected ? "Bo chon" : "Chon tat ca"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => {
              const checked = splitParticipantIds.includes(participant.id);
              return (
                <button
                  key={participant.id}
                  type="button"
                  onClick={() => toggleSplit(participant.id)}
                  className={`min-h-11 rounded-md border px-3 text-sm font-medium transition active:scale-95 ${
                    checked
                      ? "border-violet-600 bg-violet-50 text-violet-800 dark:border-violet-500 dark:bg-violet-500/15 dark:text-violet-300"
                      : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  }`}
                >
                  {participant.name}
                </button>
              );
            })}
          </div>
          {form.formState.errors.splitParticipantIds && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {form.formState.errors.splitParticipantIds.message}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={participants.length === 0 || pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
          >
            {editingExpenseId ? <Check size={17} /> : <Plus size={17} />}
            {editingExpenseId ? "Luu khoan chi" : "Them khoan chi"}
          </button>
          {editingExpenseId && (
            <button
              type="button"
              onClick={cancelEditExpense}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Huy sua
            </button>
          )}
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {expenses.map((expense) => {
          const payer = participantById.get(expense.payerParticipantId);
          const isEditing = expense.id === editingExpenseId;
          return (
            <div
              key={expense.id}
              className={`rounded-md border p-3 ${
                isEditing
                  ? "border-violet-500 bg-violet-50 dark:border-violet-500 dark:bg-violet-500/10"
                  : "border-stone-200 dark:border-stone-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                    {expense.title}
                  </p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {payer?.name || "Khong ro"} tra, chia {expense.splitParticipantIds.length} nguoi
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-sm font-semibold text-stone-950 tabular dark:text-stone-50">
                    {formatMoney(expense.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => (isEditing ? cancelEditExpense() : startEditExpense(expense))}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md text-violet-700 transition hover:bg-violet-50 active:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-500/10 dark:active:bg-violet-500/20"
                    aria-label={`Sua ${expense.title}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(expense.id)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 active:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
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
