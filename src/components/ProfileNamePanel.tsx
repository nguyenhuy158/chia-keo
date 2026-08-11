import { useEffect, useState } from "react";
import { toast } from "sonner";
import { USER_NAME_MAX_LENGTH } from "../../shared/schemas";
import { useAppSession, useUpdateProfileName } from "../adapters/react-query/session-query";

/** Doi ten hien thi cua chinh minh — cai duy nhat trong ho so cho sua hien tai. */
export function ProfileNamePanel() {
  const { user } = useAppSession();
  const updateName = useUpdateProfileName();
  const [name, setName] = useState("");

  // Dong bo lai khi session tai xong hoac doi user (vd doi tab dang nhap khac).
  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  if (!user) return null;

  const trimmed = name.trim();
  const dirty = trimmed.length > 0 && trimmed !== user.name;

  async function handleSave() {
    if (!dirty) return;
    try {
      await updateName.mutateAsync(trimmed);
      toast.success("Đã đổi tên");
    } catch {
      toast.error("Đổi tên thất bại, thử lại sau");
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-sm font-semibold text-stone-950 dark:text-stone-50">Tên hiển thị</h3>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSave();
          }}
          maxLength={USER_NAME_MAX_LENGTH}
          className="field flex-1"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || updateName.isPending}
          className="inline-flex h-11 items-center justify-center rounded-md bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          Lưu
        </button>
      </div>
    </section>
  );
}
