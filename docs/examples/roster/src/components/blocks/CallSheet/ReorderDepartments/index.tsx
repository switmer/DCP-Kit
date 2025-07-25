import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSSProperties, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';

export const ReorderDepartments = ({
  departments,
  onUpdate,
}: {
  departments: string[];
  onUpdate: (departments: string[]) => void;
  sheetId: string;
}) => {
  const [open, setOpen] = useState(false);
  const [localDepartments, setLocalDepartments] = useState<string[]>(departments);

  useEffect(() => {
    setLocalDepartments(departments);
  }, [departments]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0.01,
      },
    }),
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setLocalDepartments((data) => {
        const oldIndex = data.indexOf(active.id as string);
        const newIndex = data.indexOf(over.id as string);
        return arrayMove(data, oldIndex, newIndex); //this is just a splice util
      });
    }
  }

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
      }}
    >
      <DialogTrigger>
        <Button variant={'accent'} size={'small'} className={cn('text-sm font-bold gap-2 px-2')}>
          Reorder Departments
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items center gap-2 items-center">Update Department Order</div>
          </DialogTitle>
        </DialogHeader>
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <div className="flex flex-col gap-2 p-6">
            <SortableContext items={localDepartments} strategy={verticalListSortingStrategy}>
              {localDepartments.map((d, i) => (
                <DraggableItem key={d} id={d} index={i} />
              ))}
            </SortableContext>
          </div>
        </DndContext>

        <DialogFooter className="flex sm:justify-between items-center">
          <div className="flex-1"></div>
          <div className="flex gap-2">
            <Button
              className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
              variant="outline"
              size="compact"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="px-4 text-sm font-semibold"
              variant="accent"
              size="compact"
              onClick={async () => {
                await onUpdate(localDepartments);
                setOpen(false);
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DraggableItem = ({ id, index }: { id: string; index: number }) => {
  const { attributes, listeners, isDragging, transform, transition, setNodeRef } = useSortable({
    id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative',
  };

  return (
    <div
      className={cn(
        'group flex relative items-center gap-1 p-2 bg-white/5 hover:bg-white/7 rounded-lg duration-150 cursor-grab',
      )}
      {...attributes}
      {...listeners}
      style={style}
      key={id}
      ref={setNodeRef}
    >
      <Icon name="drag" className={cn('text-white duration-100 w-4 h-4 opacity-20', isDragging && '!opacity-60')} />
      <div className="text-white text-base font-medium">{id}</div>
    </div>
  );
};
