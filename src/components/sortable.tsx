import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

const DRAG_ACTIVATION_DISTANCE_PX = 4;
const DRAG_MODIFIERS = [restrictToVerticalAxis, restrictToParentElement];

type SortableListProps = {
  ids: string[];
  onReorder: (orderedIds: string[]) => void;
  className?: string;
  children: ReactNode;
};

/**
 * Danh sach doc keo tha doi thu tu bang dnd-kit: chuot, cam ung va ban phim.
 * Chi goi `onReorder` khi tha, va chi khi thu tu thuc su doi.
 */
export function SortableList({ ids, onReorder, className, children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={DRAG_MODIFIERS}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>{children}</div>
      </SortableContext>
    </DndContext>
  );
}

type SortableHandle = Pick<
  ReturnType<typeof useSortable>,
  "setActivatorNodeRef" | "attributes" | "listeners"
>;

type SortableItemProps = {
  id: string;
  className?: string;
  children: (handle: SortableHandle) => ReactNode;
};

/** Mot dong trong SortableList; `children` nhan props de gan vao tay cam keo. */
export function SortableItem({ id, className = "", children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-dragging={isDragging}
      className={`relative data-[dragging=true]:z-10 data-[dragging=true]:opacity-90 data-[dragging=true]:shadow-lg ${className}`}
    >
      {children({ setActivatorNodeRef, attributes, listeners })}
    </div>
  );
}
