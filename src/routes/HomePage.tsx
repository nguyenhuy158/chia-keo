import { ListChecks } from "lucide-react";
import { useMobileShell } from "../components/mobile-shell";
import { EmptyState } from "../components/ui";

export function HomePage() {
  const shell = useMobileShell();

  return (
    <div className="space-y-4">
      <EmptyState
        title="Bat dau mot cuoc choi"
        description="Chon mot cuoc choi hoac tao cuoc choi moi de them nguoi va khoan chi."
      />
      <button
        type="button"
        onClick={() => shell?.openGames()}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] lg:hidden"
      >
        <ListChecks size={18} />
        Mo danh sach cuoc choi
      </button>
    </div>
  );
}
