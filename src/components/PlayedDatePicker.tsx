import { DateRangePicker } from "../ui/DatePicker";

const PLACEHOLDER = "Ngày chơi (chọn 1 ngày hoặc khoảng ngày)";

type PlayedDatePickerProps = {
  playedFrom: string;
  playedTo: string;
  onChange: (playedFrom: string, playedTo: string) => void;
  className?: string;
};

export function PlayedDatePicker({
  playedFrom,
  playedTo,
  onChange,
  className,
}: PlayedDatePickerProps) {
  return (
    <DateRangePicker
      className={className}
      aria-label="Ngày chơi"
      placeholder={PLACEHOLDER}
      value={
        playedFrom
          ? { start: playedFrom, end: playedTo || playedFrom }
          : undefined
      }
      onChange={({ start, end }) => onChange(start, end === start ? "" : end)}
    />
  );
}
