import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Landmark,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { ApiParticipant } from "../../shared/api-types";
import type { ParticipantInput } from "../../shared/schemas";
import { getVietQrBankLabel } from "../adapters/browser/vietqr";
import { PagedList } from "../ui/PagedList";
import { Sheet } from "../ui/Sheet";
import { SwipeAction } from "../ui/SwipeAction";
import { Avatar } from "./Avatar";
import { BankSelect } from "./BankSelect";
import { useConfirm } from "./ConfirmDialog";
import { ContactPicker } from "./ContactPicker";
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

const COMPACT_ROW_HEIGHT_PX = 60;

type ParticipantPanelProps = {
  participants: ApiParticipant[];
  pending: boolean;
  onAdd: (input: ParticipantInput) => Promise<unknown>;
  onAddMany: (people: ParticipantInput[]) => Promise<unknown>;
  onUpdate: (
    participantId: string,
    input: Partial<ParticipantInput>,
  ) => Promise<unknown>;
  onRemove: (participantId: string) => void;
  onReorder: (participantIds: string[]) => void;
  compact?: boolean;
};

export function ParticipantPanel({
  participants,
  pending,
  onAdd,
  onAddMany,
  onUpdate,
  onRemove,
  onReorder,
  compact = false,
}: ParticipantPanelProps) {
  const confirm = useConfirm();
  const [editingParticipantId, setEditingParticipantId] = useState<
    string | null
  >(null);
  const [showBank, setShowBank] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionParticipantId, setActionParticipantId] = useState("");
  const bankVisible = Boolean(editingParticipantId) || showBank;
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: emptyForm,
  });

  /**
   * Xoa nguoi cascade that (chia lai phan cac khoan chi khac) va khong nam
   * trong Lich su/hoan tac, khac voi xoa khoan chi — nen phai hoi truoc, dung
   * chung cho ca nut icon lan SwipeAction de khong co duong nao lot luoi.
   */
  async function handleRemove(participant: ApiParticipant) {
    const ok = await confirm({
      title: `Xóa ${participant.name} khỏi cuộc chơi?`,
      description:
        "Các khoản chi đã chia cho người này sẽ được chia lại cho những người còn lại.",
      confirmLabel: "Xóa",
      destructive: true,
    });
    if (!ok) return;

    onRemove(participant.id);
    toast.success(`Đã xóa ${participant.name}`);
  }

  /** Doi cho voi nguoi ngay tren/duoi trong danh sach hien tai. */
  function move(participantId: string, direction: -1 | 1) {
    const index = participants.findIndex(
      (participant) => participant.id === participantId,
    );
    const targetIndex = index + direction;
    const order = participants.map((participant) => participant.id);
    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    onReorder(order);
  }

  const handleAdd = form.handleSubmit(async (values) => {
    try {
      await onAdd(values);
      form.reset(emptyForm);
      setShowBank(false);
      toast.success("Đã thêm người tham gia");
    } catch {
      toast.error("Không lưu được");
    }
  });

  function startEdit(participant: ApiParticipant) {
    setFormOpen(true);
    setEditingParticipantId(participant.id);
    form.reset({
      name: participant.name,
      bankId: participant.bankId,
      accountNo: participant.accountNo,
      accountName: participant.accountName,
    });
  }

  function cancelEdit() {
    setFormOpen(false);
    setEditingParticipantId(null);
    form.reset(emptyForm);
  }

  const handleSaveEdit = form.handleSubmit(async (values) => {
    try {
      await onUpdate(editingParticipantId!, values);
      cancelEdit();
      toast.success("Đã lưu thông tin");
    } catch {
      toast.error("Không lưu được");
    }
  });

  const formBlock = (
    <>
      {/* Chi hien luc them nguoi moi: dang sua mot nguoi thi form o duoi la trong tam. */}
      {!editingParticipantId && (
        <ContactPicker
          participants={participants}
          pending={pending}
          onAddMany={onAddMany}
        />
      )}

      <form
        onSubmit={editingParticipantId ? handleSaveEdit : handleAdd}
        className="grid gap-3 md:grid-cols-2"
      >
        <div className={bankVisible ? "" : "md:col-span-2"}>
          <Field label="Tên" error={form.formState.errors.name?.message}>
            <input
              {...form.register("name")}
              className="field"
              placeholder="Huy"
            />
          </Field>
        </div>
        {!editingParticipantId && (
          <button
            type="button"
            onClick={() => setShowBank((current) => !current)}
            aria-expanded={showBank}
            className="flex min-h-11 w-full items-center gap-2 text-left text-sm font-medium text-violet-700 dark:text-violet-300 md:col-span-2"
          >
            <Landmark size={15} className="shrink-0" />
            <span className="min-w-0 flex-1">
              Tài khoản nhận tiền{" "}
              <span className="font-normal text-fg-muted">
                (không bắt buộc, để có QR)
              </span>
            </span>
            <ChevronDown
              size={15}
              className={`shrink-0 transition ${showBank ? "rotate-180" : ""}`}
            />
          </button>
        )}
        {bankVisible && (
          <>
            <Field label="Ngân hàng">
              <BankSelect
                value={form.watch("bankId")}
                onChange={(bankId) => form.setValue("bankId", bankId)}
              />
            </Field>
            <Field label="Số tài khoản">
              <input
                {...form.register("accountNo")}
                className="field"
                placeholder="0123456789"
              />
            </Field>
            <Field label="Tên chủ tài khoản">
              <input
                {...form.register("accountName")}
                className="field"
                placeholder="NGUYEN VAN A"
              />
            </Field>
          </>
        )}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700 sm:w-auto"
          >
            {editingParticipantId ? <Check size={17} /> : <Plus size={17} />}
            {editingParticipantId ? "Lưu thông tin" : "Thêm người"}
          </button>
          {editingParticipantId && (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={pending}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-surface px-4 text-sm font-semibold text-stone-700 transition hover:bg-surface-muted active:scale-[0.99] disabled:cursor-not-allowed disabled:text-stone-400 dark:border-stone-700 dark:text-stone-200 sm:ml-2 sm:mt-0 sm:w-auto"
            >
              <X size={17} />
              Hủy
            </button>
          )}
        </div>
      </form>
    </>
  );

  if (compact) {
    const actionParticipant = participants.find(
      (participant) => participant.id === actionParticipantId,
    );
    const actionIndex = participants.findIndex(
      (participant) => participant.id === actionParticipantId,
    );
    const actions = actionParticipant
      ? [
          {
            label: "Đưa lên",
            icon: <ChevronUp size={15} />,
            disabled: actionIndex === 0,
            onSelect: () => move(actionParticipant.id, -1),
          },
          {
            label: "Đưa xuống",
            icon: <ChevronDown size={15} />,
            disabled: actionIndex === participants.length - 1,
            onSelect: () => move(actionParticipant.id, 1),
          },
          {
            label: "Sửa",
            icon: <Pencil size={15} />,
            disabled: false,
            onSelect: () => startEdit(actionParticipant),
          },
          {
            label: "Xóa",
            icon: <Trash2 size={15} />,
            disabled: false,
            destructive: true,
            onSelect: () => handleRemove(actionParticipant),
          },
        ]
      : [];
    return (
      <section className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-2 pb-2">
          <Users size={18} className="text-violet-600 dark:text-violet-400" />
          <h3 className="text-base font-semibold text-stone-950 dark:text-stone-50">
            Người tham gia
          </h3>
          <span className="text-xs text-fg-muted tabular">
            {participants.length} người
          </span>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            aria-label="Mở form thêm người"
            className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-hover active:scale-95"
          >
            <Plus size={16} />
            Thêm
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <PagedList
            items={participants}
            getKey={(participant) => participant.id}
            rowHeight={COMPACT_ROW_HEIGHT_PX}
            empty={
              <p className="py-6 text-center text-sm text-fg-muted">
                Chưa có người tham gia.
              </p>
            }
            renderItem={(participant) => (
              <div className="flex h-full items-center gap-2 rounded-md border border-border pl-3 pr-1">
                <Avatar name={participant.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                    {participant.name}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {participant.bankId && participant.accountNo
                      ? `${getVietQrBankLabel(participant.bankId)} · ${participant.accountNo}`
                      : "Chưa có thông tin QR"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`Tùy chọn ${participant.name}`}
                  onClick={() => {
                    setActionParticipantId(participant.id);
                    setActionsOpen(true);
                  }}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-muted"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            )}
          />
        </div>
        <Sheet
          open={formOpen}
          onClose={cancelEdit}
          title={editingParticipantId ? "Sửa người" : "Thêm người"}
        >
          {formBlock}
        </Sheet>
        <Sheet
          open={actionsOpen}
          onClose={() => setActionsOpen(false)}
          title={actionParticipant?.name ?? ""}
        >
          <div className="flex flex-col gap-2 pb-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={action.disabled || pending}
                onClick={() => {
                  setActionsOpen(false);
                  action.onSelect();
                }}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${
                  action.destructive
                    ? "border-danger/40 text-danger"
                    : "border-border text-stone-700 hover:bg-surface-muted dark:text-stone-200"
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </Sheet>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users size={18} className="text-violet-600 dark:text-violet-400" />
        <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
          Người tham gia
        </h3>
      </div>

      {formBlock}

      <div className="mt-5 space-y-2">
        {participants.map((participant, index) => (
          <div key={participant.id}>
            <SwipeAction
              label="Xóa"
              icon={<Trash2 size={15} />}
              onAction={handleRemove.bind(null, participant)}
            >
              <div className="rounded-md border border-border p-3">
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
                      <p className="mt-1 truncate text-xs text-fg-muted">
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
                      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-stone-600 transition hover:bg-surface-muted active:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300 dark:text-stone-300 dark:active:bg-stone-700"
                      aria-label={`Sửa ${participant.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(participant)}
                      disabled={pending}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-rose-600 transition hover:bg-danger-soft active:bg-rose-100 disabled:cursor-not-allowed disabled:text-rose-300 dark:text-rose-400 dark:active:bg-rose-500/20"
                      aria-label={`Xóa ${participant.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </SwipeAction>
          </div>
        ))}
      </div>
    </section>
  );
}
