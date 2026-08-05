import { BookUser, Check, Plus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import type { ApiParticipant } from "../../shared/api-types";
import { type Contact, normalizeContactName } from "../../shared/contacts";
import type { ParticipantInput } from "../../shared/schemas";
import { useContacts } from "../adapters/react-query/queries";

type ContactPickerProps = {
  /** Nguoi da co trong cuoc chia; danh ba se danh dau san, khong cho chon lai. */
  participants: ApiParticipant[];
  pending: boolean;
  onAddMany: (people: ParticipantInput[]) => Promise<unknown>;
};

function toInput(contact: Contact): ParticipantInput {
  return {
    name: contact.name,
    bankId: contact.bankId,
    accountNo: contact.accountNo,
    accountName: contact.accountName,
  };
}

/**
 * Chon nhanh nguoi hay di cung. Danh ba lay tu cac cuoc chia truoc do, nen lan
 * dau dung app se rong — luc do an luon khoi chiem cho.
 */
export function ContactPicker({ participants, pending, onAddMany }: ContactPickerProps) {
  const contactsQuery = useContacts();
  const [chosen, setChosen] = useState<string[]>([]);

  const alreadyIn = useMemo(
    () => new Set(participants.map((participant) => normalizeContactName(participant.name))),
    [participants],
  );

  const contacts = contactsQuery.data || [];
  // Nguoi da co trong cuoc chia xuong cuoi: cho trong tam danh cho nguoi con chon duoc.
  const sorted = useMemo(
    () =>
      [...contacts].sort(
        (a, b) => Number(alreadyIn.has(a.key)) - Number(alreadyIn.has(b.key)),
      ),
    [contacts, alreadyIn],
  );

  if (contactsQuery.isPending || contacts.length === 0) return null;

  const selectable = sorted.filter((contact) => !alreadyIn.has(contact.key));
  // Bo chon nguoi vua duoc them o cuoc chia nay (chon roi moi bam Them).
  const activeChosen = chosen.filter((key) => !alreadyIn.has(key));

  async function handleAdd() {
    const people = selectable
      .filter((contact) => activeChosen.includes(contact.key))
      .map(toInput);
    if (people.length === 0) return;

    await onAddMany(people);
    setChosen([]);
  }

  function toggle(key: string) {
    setChosen((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  return (
    <div className="mb-4 rounded-md border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950">
      <div className="flex items-center gap-2">
        <BookUser size={15} className="text-violet-600 dark:text-violet-400" />
        <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
          Người quen
        </p>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          bấm để chọn, khỏi nhập lại
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {sorted.map((contact) => {
          const inGame = alreadyIn.has(contact.key);
          const picked = activeChosen.includes(contact.key);

          return (
            <button
              key={contact.key}
              type="button"
              disabled={inGame || pending}
              onClick={() => toggle(contact.key)}
              title={
                inGame
                  ? `${contact.name} đã có trong cuộc chia này`
                  : `${contact.name}${contact.accountNo ? ` · ${contact.bankId} ${contact.accountNo}` : " · chưa có QR"} · ${contact.gameCount} cuộc chia`
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                inGame
                  ? "cursor-default border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-600"
                  : picked
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:border-violet-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
              }`}
            >
              {inGame ? <Check size={13} /> : picked ? <Check size={13} /> : <Plus size={13} />}
              {contact.name}
            </button>
          );
        })}
      </div>

      {activeChosen.length > 0 && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700 sm:w-auto"
        >
          <UserPlus size={16} />
          Thêm {activeChosen.length} người
        </button>
      )}
    </div>
  );
}
