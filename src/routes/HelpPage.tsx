import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Accordion } from "../ui/Accordion";
import { HELP_GROUPS } from "./help-content";

const FIRST_OPEN_TOPIC = HELP_GROUPS[0].topics[0].id;

export function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-5">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <ArrowLeft size={14} />
          Trang chính
        </Link>
        <h1 className="text-xl font-bold text-stone-950 dark:text-stone-50">
          Hướng dẫn sử dụng
        </h1>
      </div>

      <p className="text-sm text-fg-muted">
        Chia Kèo giúp chia tiền sau mỗi buổi chơi và tạo QR chuyển khoản. Bấm
        vào từng mục để xem các bước.
      </p>

      {HELP_GROUPS.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`help-${group.id}`}
          className="space-y-2"
        >
          <h2
            id={`help-${group.id}`}
            className="text-base font-semibold text-stone-950 dark:text-stone-50"
          >
            {group.title}
          </h2>
          <Accordion
            defaultOpen={[FIRST_OPEN_TOPIC]}
            items={group.topics.map((topic) => ({
              id: topic.id,
              title: topic.title,
              content: (
                <ol className="list-decimal space-y-2 pl-5">
                  {topic.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ),
            }))}
          />
        </section>
      ))}
    </div>
  );
}
