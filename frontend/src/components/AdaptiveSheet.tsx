import { Modal } from "../ui/Modal";
import { Sheet, type SheetProps } from "../ui/Sheet";
import { useIsDesktop } from "./use-is-desktop";

/**
 * Cung mot noi dung, hai kieu hien: tren may tinh la popup giua man hinh (drawer
 * keo tu day len nhin la tren PC), tren dien thoai la drawer. Ngan keo ben
 * canh (`side` left/right) luon la drawer vi chi co o giao dien dien thoai.
 */
export function AdaptiveSheet(props: SheetProps) {
  const isDesktop = useIsDesktop();
  const { open, onClose, title, side = "bottom", children } = props;

  if (isDesktop && side === "bottom") {
    return (
      <Modal open={open} onClose={onClose} title={title} size="lg">
        {children}
      </Modal>
    );
  }

  return <Sheet {...props} />;
}
