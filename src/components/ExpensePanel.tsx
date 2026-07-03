import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ResolvedAiExpense } from "../../shared/ai";
import type { ApiExpense, ApiParticipant } from "../../shared/api-types";
import { DEFAULT_EXPENSE_TITLE, type ExpenseInput } from "../../shared/schemas";
import { formatMoney, parseMoney } from "../lib/money";
import { useAiScanReceipt, useAiSuggestExpense } from "../lib/queries";
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

      <div className="mb-4 rounded-md border border-violet-200 bg-violet-50 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-violet-800">
          <Sparkles size={15} />
          Nhap nhanh bang AI
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={aiText}
            onChange={(event) => setAiText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAiSuggest();
              }
            }}
            className="field flex-1 bg-white"
            placeholder="Vi du: an toi 500k Huy tra chia 3"
            disabled={participants.length === 0}
          />
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={aiPending || participants.length === 0}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-violet-700 px-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            <Sparkles size={15} />
            {aiSuggest.isPending ? "Dang doc..." : "Goi y"}
          </button>
          <label
            className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-violet-300 bg-white px-3 text-sm font-medium text-violet-800 transition hover:bg-violet-100 ${
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
        {aiError && <p className="mt-2 text-xs text-red-600">{aiError}</p>}
        <p className="mt-2 text-xs text-violet-700">
          AI dien san form ben duoi, kiem tra lai truoc khi them.
        </p>
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
