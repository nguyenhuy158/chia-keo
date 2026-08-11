import { Clock, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import type { ApiCollaborator, ApiShareCandidate } from "../../shared/api-types";
import {
  useAddCollaborator,
  useRemoveCollaborator,
  useRemovePendingCollaborator,
  useShareCandidates,
} from "../adapters/react-query/queries";
import { useConfirm } from "./ConfirmDialog";
import { Avatar } from "./Avatar";

const ERROR_MESSAGES: Record<string, string> = {
  is_owner: "Đây là email của bạn rồi.",
  already_shared: "Người này đã được chia sẻ rồi.",
  invalid_input: "Email không hợp lệ.",
};

function toErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  return ERROR_MESSAGES[code] || "Chia sẻ thất bại, thử lại sau.";
}

type CollaboratorsPanelProps = {
  gameId: string;
  isOwner: boolean;
  collaborators: ApiCollaborator[];
};

/**
 * Chi chu cuoc choi them/xoa duoc; nguoi duoc chia se chi xem danh sach nay
 * de biet ai khac cung dang sua cuoc choi.
 */
export function CollaboratorsPanel({ gameId, isOwner, collaborators }: CollaboratorsPanelProps) {
  const confirm = useConfirm();
  const addCollaborator = useAddCollaborator(gameId);
  const removeCollaborator = useRemoveCollaborator(gameId);
  const removePendingCollaborator = useRemovePendingCollaborator(gameId);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const candidatesQuery = useShareCandidates(gameId, isOwner);
  const candidates = candidatesQuery.data || [];

  if (!isOwner && collaborators.length === 0) return null;

  const filteredCandidates = email.trim()
    ? candidates.filter((candidate) => {
        const needle = email.trim().toLowerCase();
        return (
          candidate.email.toLowerCase().includes(needle) ||
          candidate.name.toLowerCase().includes(needle)
        );
      })
    : candidates;

  async function submitEmail(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setError("");
    setDropdownOpen(false);
    try {
      await addCollaborator.mutateAsync(trimmed);
      setEmail("");
    } catch (addError) {
      setError(toErrorMessage(addError));
    }
  }

  function handleAdd() {
    return submitEmail(email);
  }

  function handlePickCandidate(candidate: ApiShareCandidate) {
    return submitEmail(candidate.email);
  }

  async function handleRemove(collaborator: ApiCollaborator) {
    const ok = await confirm({
      title: `Bỏ chia sẻ với ${collaborator.name || collaborator.email}?`,
      description: "Người này sẽ không sửa được cuộc chơi nữa.",
      confirmLabel: "Bỏ chia sẻ",
      destructive: true,
    });
    if (!ok) return;

    if (collaborator.userId) {
      await removeCollaborator.mutateAsync(collaborator.userId);
    } else {
      await removePendingCollaborator.mutateAsync(collaborator.email);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
        Chia sẻ cuộc chơi
      </h3>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        Người được chia sẻ sửa được mọi thứ, trừ xóa cuộc chơi. Email chưa từng đăng nhập vẫn
        chia sẻ được — họ đăng nhập vào là thấy ngay.
      </p>

      {isOwner && (
        <div className="mt-3">
          <div className="relative flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setDropdownOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAdd();
                if (event.key === "Escape") setDropdownOpen(false);
              }}
              placeholder="Email người muốn chia sẻ, hoặc chọn từ danh sách"
              className="field flex-1"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={addCollaborator.isPending || !email.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-violet-600 px-3 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              <UserPlus size={15} />
              Chia sẻ
            </button>

            {dropdownOpen && filteredCandidates.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                {filteredCandidates.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      // onMouseDown chay truoc onBlur cua input nen chon duoc
                      // truoc khi dropdown bi dong.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handlePickCandidate(candidate)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Avatar name={candidate.name || candidate.email} size={24} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-stone-950 dark:text-stone-50">
                          {candidate.name || candidate.email}
                        </p>
                        {candidate.name && (
                          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                            {candidate.email}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      )}

      {collaborators.length > 0 && (
        <ul className="mt-4 space-y-2">
          {collaborators.map((collaborator) => (
            <li
              key={collaborator.userId}
              className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-2 dark:border-stone-800"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={collaborator.name || collaborator.email} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-950 dark:text-stone-50">
                    {collaborator.name || collaborator.email}
                  </p>
                  {collaborator.userId ? (
                    collaborator.name && (
                      <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                        {collaborator.email}
                      </p>
                    )
                  ) : (
                    <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Clock size={11} />
                      Chờ đăng nhập
                    </p>
                  )}
                </div>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemove(collaborator)}
                  disabled={removeCollaborator.isPending || removePendingCollaborator.isPending}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 active:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
                  aria-label={`Bỏ chia sẻ với ${collaborator.name || collaborator.email}`}
                >
                  <UserMinus size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
