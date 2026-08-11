import { UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import type { ApiCollaborator } from "../../shared/api-types";
import { useAddCollaborator, useRemoveCollaborator } from "../adapters/react-query/queries";
import { useConfirm } from "./ConfirmDialog";
import { Avatar } from "./Avatar";

const ERROR_MESSAGES: Record<string, string> = {
  user_not_found: "Email này chưa có tài khoản trong hệ thống.",
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
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  if (!isOwner && collaborators.length === 0) return null;

  async function handleAdd() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError("");
    try {
      await addCollaborator.mutateAsync(trimmed);
      setEmail("");
    } catch (addError) {
      setError(toErrorMessage(addError));
    }
  }

  async function handleRemove(collaborator: ApiCollaborator) {
    const ok = await confirm({
      title: `Bỏ chia sẻ với ${collaborator.name}?`,
      description: "Người này sẽ không sửa được cuộc chơi nữa.",
      confirmLabel: "Bỏ chia sẻ",
      destructive: true,
    });
    if (!ok) return;

    await removeCollaborator.mutateAsync(collaborator.userId);
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
        Chia sẻ cuộc chơi
      </h3>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        Người được chia sẻ sửa được mọi thứ, trừ xóa cuộc chơi.
      </p>

      {isOwner && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAdd();
              }}
              placeholder="Email người đã có tài khoản"
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
                <Avatar name={collaborator.name} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-950 dark:text-stone-50">
                    {collaborator.name}
                  </p>
                  <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                    {collaborator.email}
                  </p>
                </div>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemove(collaborator)}
                  disabled={removeCollaborator.isPending}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 active:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:active:bg-rose-500/20"
                  aria-label={`Bỏ chia sẻ với ${collaborator.name}`}
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
