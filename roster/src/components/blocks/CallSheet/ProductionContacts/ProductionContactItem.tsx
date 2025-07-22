import React, { CSSProperties, FC, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { formatPhoneNumber } from 'react-phone-number-input/min';
import { cn } from '@/lib/utils';
import { ProductionContactCrew } from '@/components/blocks/CallSheet/ProductionContacts/index';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
  contact: ProductionContactCrew;
  selected: boolean;
  onSetSelected: () => void;
  deleteSelectedContact: (id?: string) => void;
  selectedIsOnCrewList: boolean;
};

export const ProductionContactItem: FC<Props> = (props) => {
  const words = props.contact.name.split(' ');

  let initials = '';

  for (const word of words) {
    if (word.length > 0) {
      initials += word[0]?.toUpperCase();
    }
  }

  const { transform, transition, setNodeRef, isDragging, attributes, listeners } = useSortable({
    id: props.contact.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 1 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative',
  };

  let phone = formatPhoneNumber(props.contact.phone);

  if (!phone) {
    const cleanPhone = props.contact.phone.replace(/[^0-9]/g, '');
    phone = formatPhoneNumber('+1' + cleanPhone);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => props.onSetSelected()}
      className={cn(
        'group flex flex-col px-3 py-3 rounded-xl min-w-[200px] h-[105px] hover:bg-stone-500/20',
        // isDragging ? "cursor-grabbing" : "cursor-pointer",
        props.selected && 'bg-lime-300/10 hover:bg-lime-300/15',
      )}
      key={props.contact.id}
    >
      <div
        className={cn(
          'flex justify-between items-center h-[15px] font-label font-medium uppercase text-sm text-white/80 mb-2 leading-none max-sm:mb-3',
          isDragging ? 'cursor-grabbing' : 'cursor-pointer',
          props.selected && 'text-lime-300',
        )}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        {props.contact.position.replaceAll('_', ' ')}

        <Icon
          name="drag"
          className={cn(
            'hidden w-4 h-4 text-stone-500/50 group-hover:block hover:text-stone-500/80',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
        />
      </div>

      <div className={cn('flex items-center gap-2', isDragging ? 'cursor-grabbing' : 'cursor-pointer')}>
        <Avatar>
          <AvatarFallback>
            <span>{initials}</span>
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-start gap-2 w-full">
          <div className="text-white text-md font-bold leading-none max-sm:text-[16px]">{props.contact.name}</div>

          <div className="flex items-center justify-between w-full h-[17px]">
            <div className="flex items-center text-white/70 text-sm font-normal leading-none">{phone}</div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                props.deleteSelectedContact(props.contact.id);
              }}
              className="flex items-center gap-1 cursor-pointer"
            >
              {/*<div className="text-sm text-zinc-500/80 group-hover:text-zinc-400/100">*/}
              {/*  Remove*/}
              {/*</div>*/}

              <Icon
                name="bin"
                className="hidden w-[17px] h-[17px] text-zinc-500/70 hover:text-red-400 group-hover:block"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
