import { BookUser, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Contact } from "../../shared/contacts";
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
} from "../adapters/react-query/queries";
import { getVietQrBankLabel } from "../adapters/browser/vietqr";
import { BankSelect } from "./BankSelect";
import { useConfirm } from "./ConfirmDialog";
import { useToast } from "./Toast";

type Draft = { name: string; bankId: string; accountNo: string; accountName: string };

const EMPTY: Draft = { name: "", bankId: "", accountNo: "", accountName: "" };

function DraftForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  pending,
  submitLabel,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-2"
    >
      <input
        value={draft.name}
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
        className="field"
        placeholder="Tên · Huy"
        aria-label="Tên"
      />
      <BankSelect
        value={draft.bankId}
        onChange={(bankId) => onChange({ ...draft, bankId })}
        ariaLabel="Ngân hàng"
      />
      <input
        value={draft.accountNo}
        onChange={(event) => onChange({ ...draft, accountNo: event.target.value })}
        className="field"
        placeholder="Số tài khoản"
        aria-label="Số tài khoản"
      />
      <input
        value={draft.accountName}
        onChange={(event) => onChange({ ...draft, accountName: event.target.value })}
        className="field"
        placeholder="Tên chủ tài khoản (NGUYEN VAN A)"
        aria-label="Tên chủ tài khoản"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || draft.name.trim() === ""}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
        >
          <Check size={15} />
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <X size={15} />
            Hủy
          </button>
        )}
      </div>
    </form>
  );
}

function ContactRow({
  contact,
  onEdit,
  onDelete,
  pending,
}: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 px-1 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
          {contact.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
          {contact.accountNo
            ? `${getVietQrBankLabel(contact.bankId) || "?"} · ${contact.accountNo}`
            : "chưa có số tài khoản"}
          {contact.gameCount > 0 && ` · ${contact.gameCount} cuộc`}
        </p>
      </div>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onEdit}
          disabled={pending}
          aria-label={`Sửa ${contact.name}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:opacity-40 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <Pencil size={14} />
        </button>
        {/* Nguoi chi suy ra tu lich su khong co dong nao trong danh ba de xoa;
            sua ho se tao dong moi, luc do moi xoa duoc. */}
        {contact.source === "book" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label={`Xóa ${contact.name} khỏi danh bạ`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-rose-500 transition hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Card danh ba o sidebar: nhap san thong tin nguoi hay di cung (ten, so tai
 * khoan) de trong tung cuoc chia chi con tick chon ai tham gia.
 */
export function ContactBookCard() {
  const toast = useToast();
  const confirm = useConfirm();
  const contactsQuery = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const pending = createContact.isPending || updateContact.isPending || deleteContact.isPending;
  const contacts = contactsQuery.data || [];

  function startEdit(contact: Contact) {
    setEditingKey(contact.key);
    setAdding(false);
    setDraft({
      name: contact.name,
      bankId: contact.bankId,
      accountNo: contact.accountNo,
      accountName: contact.accountName,
    });
  }

  function reset() {
    setEditingKey(null);
    setAdding(false);
    setDraft(EMPTY);
  }

  async function handleSave(contact: Contact | null) {
    try {
      // Nguoi suy ra tu lich su chua co dong trong danh ba: luu la tao moi.
      // POST tu ghi de theo ten nen khong so tao trung.
      if (contact?.id) {
        await updateContact.mutateAsync({ contactId: contact.id, input: draft });
      } else {
        await createContact.mutateAsync(draft);
      }

      toast(contact ? "Đã lưu vào danh bạ" : "Đã thêm vào danh bạ");
      reset();
    } catch {
      toast("Không lưu được danh bạ", "error");
    }
  }

  async function handleDelete(contact: Contact) {
    if (!contact.id) return;
    if (!(await confirm({ title: `Xóa ${contact.name} khỏi danh bạ?`, destructive: true }))) return;

    try {
      await deleteContact.mutateAsync(contact.id);
      toast("Đã xóa khỏi danh bạ");
    } catch {
      toast("Không xóa được", "error");
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-200">
          <BookUser size={17} />
          Danh bạ
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((current) => !current);
            setEditingKey(null);
            setDraft(EMPTY);
          }}
          aria-label="Thêm vào danh bạ"
          title="Thêm người"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-violet-600 text-white transition hover:bg-violet-700 active:scale-95"
        >
          {adding ? <X size={15} /> : <Plus size={15} />}
        </button>
      </div>

      {adding && (
        <div className="mb-2 rounded-md border border-stone-200 p-2 dark:border-stone-800">
          <DraftForm
            draft={draft}
            onChange={setDraft}
            onSubmit={() => handleSave(null)}
            onCancel={reset}
            pending={pending}
            submitLabel="Thêm"
          />
        </div>
      )}

      {contactsQuery.isPending ? (
        <p className="px-1 py-3 text-sm text-stone-500 dark:text-stone-400">Đang tải...</p>
      ) : contacts.length === 0 ? (
        <p className="px-1 py-3 text-sm text-stone-500 dark:text-stone-400">
          Chưa có ai. Thêm sẵn người hay đi cùng để mỗi cuộc chơi chỉ cần tick chọn.
        </p>
      ) : (
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {contacts.map((contact) =>
            editingKey === contact.key ? (
              <div key={contact.key} className="py-2">
                <DraftForm
                  draft={draft}
                  onChange={setDraft}
                  onSubmit={() => handleSave(contact)}
                  onCancel={reset}
                  pending={pending}
                  submitLabel="Lưu"
                />
              </div>
            ) : (
              <ContactRow
                key={contact.key}
                contact={contact}
                pending={pending}
                onEdit={() => startEdit(contact)}
                onDelete={() => handleDelete(contact)}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}
