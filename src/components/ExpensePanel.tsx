import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  Check,
  ImagePlus,
  Minus,
  Paperclip,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import type { ResolvedAiExpense } from "../../shared/ai";
import type { ApiExpense, ApiGameDetail, ApiParticipant, ApiPhoto } from "../../shared/api-types";
import { countPhotosByExpenseId, filterPhotosByExpenseId, toDataUrl } from "../../shared/photos";
import {
  DEFAULT_EXPENSE_TITLE,
  MAX_SPLIT_WEIGHT,
  type ExpenseInput,
  type SplitMode,
} from "../../shared/schemas";
import { formatMoney, parseMoney } from "../core/domain/money";
import { usePhotoUploader } from "../adapters/react-query/photo-upload";
import { useAiScanReceipt, useAiSuggestExpense } from "../adapters/react-query/queries";
import { MoneyInput } from "./MoneyInput";
import { PhotoPickerButton } from "./PhotoPanel";
import { Field } from "./ui";
import { usePhotoViewer } from "./use-photo-viewer";

/** Doc so phan tu o nhap cua mode "shares"; bo trong hieu la 1 phan. */
function parseWeight(value: string | undefined) {
  const parsed = Number.parseInt((value || "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const expenseFormSchema = z
  .object({
    title: z.string().trim(),
    amount: z.string().refine((value) => parseMoney(value) > 0, "Nhập số tiền hợp lệ"),
    payerId: z.string().min(1, "Chọn người trả"),
    splitMode: z.enum(["equal", "shares", "amount"]),
    splitParticipantIds: z.array(z.string()).min(1, "Chọn ít nhất một người cùng chia"),
    // Gia tri nhap theo tung nguoi: so phan (shares) hoac so tien (amount).
    splitValues: z.record(z.string(), z.string()),
  })
  .superRefine((values, ctx) => {
    if (values.splitMode === "shares") {
      const tooBig = values.splitParticipantIds.some(
        (id) => parseWeight(values.splitValues[id]) > MAX_SPLIT_WEIGHT,
      );
      if (tooBig) {
        ctx.addIssue({
          code: "custom",
          path: ["splitValues"],
          message: `Số phần tối đa là ${MAX_SPLIT_WEIGHT}`,
        });
      }
    }

    if (values.splitMode === "amount") {
      const hasEmpty = values.splitParticipantIds.some(
        (id) => parseMoney(values.splitValues[id] || "") <= 0,
      );
      if (hasEmpty) {
        ctx.addIssue({
          code: "custom",
          path: ["splitValues"],
          message: "Mỗi người được chọn phải có phần lớn hơn 0",
        });
        return;
      }

      const assigned = values.splitParticipantIds.reduce(
        (sum, id) => sum + parseMoney(values.splitValues[id] || ""),
        0,
      );
      const total = parseMoney(values.amount);
      if (assigned !== total) {
        ctx.addIssue({
          code: "custom",
          path: ["splitValues"],
          message: `Tổng các phần (${formatMoney(assigned)}) phải bằng số tiền (${formatMoney(total)})`,
        });
      }
    }
  });

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const SPLIT_MODE_OPTIONS: Array<{ id: SplitMode; label: string }> = [
  { id: "equal", label: "Chia đều" },
  { id: "shares", label: "Theo phần" },
  { id: "amount", label: "Số tiền" },
];

const SPLIT_MODE_BADGES: Record<SplitMode, string> = {
  equal: "",
  shares: "theo phần",
  amount: "số tiền riêng",
};

/** So anh hien thi truc tiep tren mot dong khoan chi. */
const EXPENSE_THUMB_LIMIT = 3;

type ExpensePanelProps = {
  gameId: string;
  participants: ApiParticipant[];
  expenses: ApiExpense[];
  photos: ApiPhoto[];
  pending: boolean;
  onAdd: (input: ExpenseInput) => Promise<ApiGameDetail>;
  onUpdate: (expenseId: string, input: Partial<ExpenseInput>) => Promise<unknown>;
  onRemove: (expenseId: string) => void;
};

const AI_ERROR_MESSAGES: Record<string, string> = {
  gemini_not_configured: "Server chưa cấu hình GEMINI_API_KEY nên chưa dùng được AI.",
  gemini_invalid_response: "AI trả dữ liệu không hợp lệ, thử lại với câu rõ hơn.",
  gemini_request_failed: "Gọi AI thất bại, thử lại sau.",
};

/** Khoan chi vua duoc them: id chua xuat hien trong danh sach truoc do. */
function findCreatedExpense(detail: ApiGameDetail, previous: ApiExpense[]) {
  const previousIds = new Set(previous.map((expense) => expense.id));
  return detail.expenses.find((expense) => !previousIds.has(expense.id));
}

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

/**
 * Tong tien da chia o che do "So tien". Doi mau + noi con thieu/vuot bao nhieu vi
 * day la dieu kien duy nhat chan submit.
 */
function AmountSplitTotal({ assigned, total }: { assigned: number; total: number }) {
  const diff = total - assigned;
  const balanced = diff === 0 && total > 0;
  const tone = balanced
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-amber-700 dark:text-amber-400";

  return (
    <p className={`mt-2 text-xs font-medium tabular ${tone}`}>
      Đã nhập {formatMoney(assigned)} / {formatMoney(total)}
      {balanced && " — vừa đủ"}
      {/* total = 0 nghia la chua dien "So tien" o tren, khong phai chia sai. */}
      {!balanced && total === 0 && " — nhập số tiền ở trên trước"}
      {!balanced && total > 0 && diff > 0 && ` — còn thiếu ${formatMoney(diff)}`}
      {!balanced && diff < 0 && ` — vượt ${formatMoney(-diff)}`}
    </p>
  );
}

const STEPPER_BUTTON =
  "flex h-full w-11 shrink-0 items-center justify-center text-stone-600 transition hover:bg-stone-100 active:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent dark:text-stone-300 dark:hover:bg-stone-700 dark:active:bg-stone-600";

/**
 * Nhap so phan bang nut +/- thay vi spinner mac dinh cua <input type="number">
 * (spinner chi hien khi hover, qua nho de bam tren mobile). Van cho go tay.
 */
function SharesStepper({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (next: string) => void;
  name: string;
}) {
  const parsed = Number.parseInt(value, 10);
  const current = Number.isFinite(parsed) ? parsed : 1;

  function step(delta: number) {
    onChange(String(Math.min(MAX_SPLIT_WEIGHT, Math.max(1, current + delta))));
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="flex h-11 items-center overflow-hidden rounded-lg border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-800">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={current <= 1}
          aria-label={`Giảm số phần của ${name}`}
          className={STEPPER_BUTTON}
        >
          <Minus size={16} />
        </button>
        <input
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          // Chot lai gia tri hop le khi roi input: tranh de trong hoac 0.
          onBlur={() => onChange(String(Math.min(MAX_SPLIT_WEIGHT, Math.max(1, current))))}
          className="tabular h-full w-10 min-w-0 border-x border-stone-200 bg-transparent text-center text-stone-900 outline-none dark:border-stone-700 dark:text-stone-100"
          aria-label={`Số phần của ${name}`}
        />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={current >= MAX_SPLIT_WEIGHT}
          aria-label={`Tăng số phần của ${name}`}
          className={STEPPER_BUTTON}
        >
          <Plus size={16} />
        </button>
      </div>
      <span className="text-xs text-stone-500 dark:text-stone-400">phần</span>
    </div>
  );
}

export function ExpensePanel({
  gameId,
  participants,
  expenses,
  photos,
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
      splitMode: "equal",
      splitParticipantIds: participants.map((participant) => participant.id),
      splitValues: {},
    },
  });

  const splitParticipantIds = form.watch("splitParticipantIds");
  const payerId = form.watch("payerId");
  const splitMode = form.watch("splitMode");
  const splitValues = form.watch("splitValues");
  const amountValue = form.watch("amount");

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
      form.setValue("splitMode", "equal");
      form.setValue("splitParticipantIds", suggestion.splitParticipantIds);
    }
  }

  function toAiErrorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "";
    return AI_ERROR_MESSAGES[code] || "Gọi AI thất bại, thử lại sau.";
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

  const [editingExpenseId, setEditingExpenseId] = useState("");

  // Anh dinh kem: khoan chi da luu thi tai len ngay, khoan chi moi thi giu tam
  // trong form roi tai len sau khi co id.
  const uploader = usePhotoUploader(gameId);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const stagedPreviews = useMemo(
    () => stagedFiles.map((file) => URL.createObjectURL(file)),
    [stagedFiles],
  );
  useEffect(() => {
    return () => stagedPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [stagedPreviews]);

  const photoCountByExpenseId = countPhotosByExpenseId(photos);
  const expenseTitleById = new Map(expenses.map((expense) => [expense.id, expense.title]));
  const [photoExpenseId, setPhotoExpenseId] = useState("");
  const viewerPhotos = photoExpenseId ? filterPhotosByExpenseId(photos, photoExpenseId) : [];
  const photoViewer = usePhotoViewer(gameId, viewerPhotos, expenseTitleById);
  const editingPhotos = editingExpenseId
    ? filterPhotosByExpenseId(photos, editingExpenseId)
    : [];

  function openExpensePhotos(expenseId: string, index: number) {
    setPhotoExpenseId(expenseId);
    photoViewer.open(index);
  }

  /** Anh chon khi dang sua duoc gan ngay; khi them moi thi cho luu xong. */
  async function handlePickPhotos(files: File[]) {
    if (files.length === 0) return;

    if (editingExpenseId) {
      await uploader.upload(files, { expenseId: editingExpenseId });
      return;
    }
    setStagedFiles((current) => [...current, ...files]);
  }

  function removeStagedFile(index: number) {
    setStagedFiles((current) => current.filter((_, position) => position !== index));
  }

  async function handleAiReceipt(file: File | undefined) {
    if (!file || aiPending) return;

    setAiError("");
    try {
      const data = await readFileAsBase64(file);
      const { suggestion } = await aiReceipt.mutateAsync({ mimeType: file.type, data });
      applyAiSuggestion(suggestion);
      // Giu lai anh hoa don vua quet lam anh dinh kem cua khoan chi.
      await handlePickPhotos([file]);
    } catch (error) {
      setAiError(toAiErrorMessage(error));
    }
  }

  function startEditExpense(expense: ApiExpense) {
    setEditingExpenseId(expense.id);
    const values: Record<string, string> = {};
    for (const split of expense.splits) {
      values[split.participantId] =
        expense.splitMode === "shares" ? String(split.weight || 1) : String(split.amount);
    }
    form.reset({
      title: expense.title,
      amount: String(expense.amount),
      payerId: expense.payerParticipantId,
      splitMode: expense.splitMode,
      splitParticipantIds: expense.splitParticipantIds,
      splitValues: values,
    });
  }

  function cancelEditExpense() {
    setEditingExpenseId("");
    setStagedFiles([]);
    form.reset({
      title: "",
      amount: "",
      payerId: participants[0]?.id || "",
      splitMode: "equal",
      splitParticipantIds: participants.map((participant) => participant.id),
      splitValues: {},
    });
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const input: ExpenseInput = {
      title: values.title || DEFAULT_EXPENSE_TITLE,
      amount: parseMoney(values.amount),
      note: "",
      payerParticipantId: values.payerId,
      splitMode: values.splitMode,
      splitParticipantIds: values.splitMode === "equal" ? values.splitParticipantIds : [],
      splits:
        values.splitMode === "equal"
          ? []
          : values.splitParticipantIds.map((participantId) => ({
              participantId,
              value:
                values.splitMode === "shares"
                  ? parseWeight(values.splitValues[participantId])
                  : parseMoney(values.splitValues[participantId] || ""),
            })),
    };

    if (editingExpenseId) {
      await onUpdate(editingExpenseId, input);
      setEditingExpenseId("");
    } else {
      const detail = await onAdd(input);
      const created = findCreatedExpense(detail, expenses);
      if (created && stagedFiles.length > 0) {
        await uploader.upload(stagedFiles, { expenseId: created.id });
      }
    }
    setStagedFiles([]);
    form.reset({
      title: "",
      amount: "",
      payerId: values.payerId,
      splitMode: values.splitMode,
      splitParticipantIds: values.splitParticipantIds,
      splitValues: {},
    });
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center gap-2">
        <Banknote size={18} className="text-amber-500" />
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">Khoản chi</h3>
      </div>

      <div className="mb-4 rounded-md border border-violet-200 bg-violet-50 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
        <div className="flex items-center gap-2 text-sm font-medium text-violet-800 dark:text-violet-300">
          <Sparkles size={15} />
          Nhập nhanh bằng AI
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
            className="field w-full flex-1 bg-white dark:bg-stone-800 sm:w-auto"
            placeholder="Ví dụ: ăn tối 500k Huy trả chia 3"
            disabled={participants.length === 0}
          />
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={aiPending || participants.length === 0}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-violet-700 px-3 text-sm font-semibold text-white transition hover:bg-violet-800 active:scale-95 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700 sm:h-10"
          >
            <Sparkles size={15} />
            {aiSuggest.isPending ? "Đang đọc..." : "Gợi ý"}
          </button>
          <label
            className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-violet-300 bg-white px-3 text-sm font-medium text-violet-800 transition hover:bg-violet-100 dark:border-violet-500/40 dark:bg-stone-800 dark:text-violet-300 dark:hover:bg-stone-700 sm:h-10 ${
              aiPending || participants.length === 0 ? "pointer-events-none opacity-50" : ""
            }`}
            title="Quét ảnh hóa đơn"
          >
            <ImagePlus size={15} />
            {aiReceipt.isPending ? "Đang quét..." : "Hóa đơn"}
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
          AI điền sẵn form bên dưới, kiểm tra lại trước khi thêm.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <Field label="Nội dung">
          <input {...form.register("title")} className="field" placeholder="Ăn tối" />
        </Field>
        <Field label="Số tiền" error={form.formState.errors.amount?.message}>
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
        <Field label="Người trả" error={form.formState.errors.payerId?.message}>
          <select {...form.register("payerId")} value={payerId} className="field">
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            {/* Nut chon tat ca dat canh nhan, khong ep vao segmented control keo
                nguoi dung tuong la tab thu 4. */}
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Chia cho ai</p>
              {participants.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAllSplit(!allSelected)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 transition hover:bg-violet-50 active:bg-violet-100 dark:text-violet-400 dark:decoration-violet-500/50 dark:hover:bg-violet-500/10 dark:active:bg-violet-500/20"
                >
                  {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md bg-stone-100 p-0.5 dark:bg-stone-800">
                {SPLIT_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      form.setValue("splitMode", option.id, {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                    className={`rounded px-2.5 py-1.5 text-xs font-semibold transition ${
                      splitMode === option.id
                        ? "bg-white text-violet-700 shadow-sm dark:bg-stone-900 dark:text-violet-300"
                        : "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {splitMode === "equal" ? (
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
          ) : (
            <div className="space-y-2">
              {participants.map((participant) => {
                const checked = splitParticipantIds.includes(participant.id);
                return (
                  <div key={participant.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSplit(participant.id)}
                      className={`min-h-11 min-w-0 flex-1 truncate rounded-md border px-3 text-left text-sm font-medium transition active:scale-[0.99] ${
                        checked
                          ? "border-violet-600 bg-violet-50 text-violet-800 dark:border-violet-500 dark:bg-violet-500/15 dark:text-violet-300"
                          : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                      }`}
                    >
                      {participant.name}
                    </button>
                    {checked &&
                      (splitMode === "shares" ? (
                        <SharesStepper
                          name={participant.name}
                          value={splitValues[participant.id] ?? "1"}
                          onChange={(next) =>
                            form.setValue(
                              "splitValues",
                              { ...splitValues, [participant.id]: next },
                              { shouldValidate: form.formState.isSubmitted },
                            )
                          }
                        />
                      ) : (
                        <MoneyInput
                          value={splitValues[participant.id] ?? ""}
                          onChange={(value) =>
                            form.setValue(
                              "splitValues",
                              { ...splitValues, [participant.id]: value },
                              { shouldValidate: form.formState.isSubmitted },
                            )
                          }
                          placeholder="0"
                          className="w-32 shrink-0 text-right"
                          aria-label={`Phần tiền của ${participant.name}`}
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          )}

          {splitMode === "amount" && splitParticipantIds.length > 0 && (
            <AmountSplitTotal
              assigned={splitParticipantIds.reduce(
                (sum, id) => sum + parseMoney(splitValues[id] || ""),
                0,
              )}
              total={parseMoney(amountValue)}
            />
          )}
          {form.formState.errors.splitParticipantIds && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {form.formState.errors.splitParticipantIds.message}
            </p>
          )}
          {form.formState.errors.splitValues && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {(form.formState.errors.splitValues as { message?: string }).message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Ảnh hóa đơn
              {editingPhotos.length + stagedFiles.length > 0 &&
                ` (${editingPhotos.length + stagedFiles.length})`}
            </p>
            <PhotoPickerButton
              label={
                uploader.pending
                  ? `Đang tải ${uploader.done + 1}/${uploader.total}`
                  : "Đính kèm ảnh"
              }
              ariaLabel="Đính kèm ảnh hóa đơn"
              disabled={uploader.pending}
              onPick={handlePickPhotos}
              className="border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              <Paperclip size={15} />
            </PhotoPickerButton>
          </div>

          {(editingPhotos.length > 0 || stagedPreviews.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {editingPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => openExpensePhotos(editingExpenseId, index)}
                  className="h-16 w-16 overflow-hidden rounded-md border border-stone-200 transition active:scale-95 dark:border-stone-700"
                  aria-label={`Xem ảnh ${index + 1}`}
                >
                  <img
                    src={toDataUrl(photo.mimeType, photo.thumbData)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
              {stagedPreviews.map((url, index) => (
                <div
                  key={url}
                  className="relative h-16 w-16 overflow-hidden rounded-md border border-violet-300 dark:border-violet-500/50"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeStagedFile(index)}
                    aria-label={`Bỏ ảnh đính kèm ${index + 1}`}
                    className="absolute right-0.5 top-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-950/70 text-white transition active:scale-90"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploader.error && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{uploader.error}</p>
          )}
          {stagedFiles.length > 0 && (
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              Ảnh sẽ được lưu kèm sau khi thêm khoản chi.
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
            {editingExpenseId ? "Lưu khoản chi" : "Thêm khoản chi"}
          </button>
          {editingExpenseId && (
            <button
              type="button"
              onClick={cancelEditExpense}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Hủy sửa
            </button>
          )}
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {expenses
          .filter((expense) => expense.kind !== "transfer")
          .map((expense) => {
          const payer = participantById.get(expense.payerParticipantId);
          const isEditing = expense.id === editingExpenseId;
          const attachedPhotos = filterPhotosByExpenseId(photos, expense.id);
          const hiddenPhotoCount =
            (photoCountByExpenseId.get(expense.id) || 0) - EXPENSE_THUMB_LIMIT;
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
                    {payer?.name || "Không rõ"} trả, chia {expense.splitParticipantIds.length} người
                    {SPLIT_MODE_BADGES[expense.splitMode] &&
                      ` · ${SPLIT_MODE_BADGES[expense.splitMode]}`}
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
                    aria-label={`Sửa ${expense.title}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(expense.id)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 active:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
                    aria-label={`Xóa ${expense.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {attachedPhotos.slice(0, EXPENSE_THUMB_LIMIT).map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => openExpensePhotos(expense.id, index)}
                    className="h-12 w-12 overflow-hidden rounded-md border border-stone-200 transition active:scale-95 dark:border-stone-700"
                    aria-label={`Xem ảnh của ${expense.title}`}
                  >
                    <img
                      src={toDataUrl(photo.mimeType, photo.thumbData)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
                {hiddenPhotoCount > 0 && (
                  <button
                    type="button"
                    onClick={() => openExpensePhotos(expense.id, EXPENSE_THUMB_LIMIT)}
                    className="h-12 w-12 rounded-md border border-stone-200 text-xs font-semibold text-stone-600 transition active:scale-95 dark:border-stone-700 dark:text-stone-300"
                  >
                    +{hiddenPhotoCount}
                  </button>
                )}
                <PhotoPickerButton
                  label={attachedPhotos.length > 0 ? "" : "Thêm ảnh"}
                  ariaLabel={`Thêm ảnh cho ${expense.title}`}
                  disabled={uploader.pending}
                  onPick={(files) => uploader.upload(files, { expenseId: expense.id })}
                  className="h-12 border border-dashed border-stone-300 text-xs text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  <Paperclip size={14} />
                </PhotoPickerButton>
              </div>
            </div>
          );
        })}
      </div>

      {photoViewer.viewer}
    </section>
  );
}
