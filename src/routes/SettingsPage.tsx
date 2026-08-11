import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { McpTokenPanel } from "../components/McpTokenPanel";
import { ProfileNamePanel } from "../components/ProfileNamePanel";

/** Trang cai dat cua tai khoan. */
export function SettingsPage() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          aria-label="Về trang chính"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <ArrowLeft size={14} />
          Trang chính
        </Link>
        <h1 className="text-sm font-semibold text-stone-950 dark:text-stone-50">Cài đặt</h1>
      </div>

      <ProfileNamePanel />
      <McpTokenPanel />
    </div>
  );
}
