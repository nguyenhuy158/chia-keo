type CollapsibleHeadingProps = {
  title: string;
  open: boolean;
  onToggle?: () => void;
};

export function CollapsibleHeading({
  title,
  open,
  onToggle,
}: CollapsibleHeadingProps) {
  const heading = (
    <h3 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
      {title}
    </h3>
  );
  if (!onToggle) return heading;

  return (
    <div className="flex items-center justify-between gap-2">
      {heading}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="rounded-md px-2 py-1 text-xs font-semibold text-violet-700 transition hover:bg-primary-soft dark:text-violet-300"
      >
        {open ? "Ẩn" : "Xem"}
      </button>
    </div>
  );
}
