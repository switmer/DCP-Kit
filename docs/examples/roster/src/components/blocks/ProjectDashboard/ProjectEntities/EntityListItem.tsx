import React, { CSSProperties, FC, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { formatPhoneNumber } from 'react-phone-number-input/min';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CompanyEntityType, EntityPointOfContactType } from '@/types/type';
import { toast } from 'sonner';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { Tooltip } from '@/components/ui/Tooltip';

type Props = {
  entity: CompanyEntityType;
  pointOfContact?: EntityPointOfContactType;
  selected: boolean;
  onSetSelected: (id: string) => void;
  deleteSelectedEntity: (id: string) => void;
};

export const EntityListItem: FC<Props> = (props) => {
  const words = props?.entity?.name?.split(' ');

  let initials = '';

  if (words) {
    for (const word of words) {
      if (word.length > 0) {
        initials += word[0]?.toUpperCase();
      }
    }
  }

  const { transform, transition, setNodeRef, isDragging, attributes, listeners } = useSortable({
    id: props.entity.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 1 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative',
  };

  let phone = '';

  if (props?.entity?.phone) {
    phone = formatPhoneNumber(props?.entity?.phone);

    if (!phone) {
      const cleanPhone = props?.entity?.phone.replace(/[^0-9]/g, '');
      phone = formatPhoneNumber('+1' + cleanPhone);
    }
  }

  if (!props.entity.phone || !props.entity.email || !props.entity.address) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={() => props.onSetSelected(props.entity.id)}
        className={cn(
          'group relative flex flex-col px-3 py-3 rounded-xl min-w-[200px] h-[115px] hover:bg-stone-500/20 cursor-pointer',
          // isDragging ? "cursor-grabbing" : "cursor-pointer",
          props.selected && 'bg-lime-300/10 hover:bg-lime-300/15',
        )}
        key={props.entity.id}
      >
        <div
          className={cn(
            'flex items-center justify-end w-full h-[15px] text-sm text-white/80',
            isDragging ? 'cursor-grabbing' : 'cursor-pointer',
            props.selected && 'text-lime-300',
          )}
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <Icon
            name="drag"
            className={cn(
              'hidden w-4 h-4 text-stone-500/50 group-hover:block hover:text-stone-500/80',
              isDragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="w-[60px] h-[60px] shrink-0">
            {props.entity.logo !== '' && (
              <AvatarImage
                src={props.entity.logo ?? ''}
                alt="Avatar"
                className="object-contain"
                onError={(e) => {
                  //-- if image fails to load.
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}

            <AvatarFallback>
              <span className="text-base text-[34px]">{initials}</span>
            </AvatarFallback>
          </Avatar>

          <div
            className={cn(
              'flex flex-col items-start justify-center gap-2',
              !props.entity.phone && !props.entity.email && !props.entity.address && 'flex-row items-center',
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2',
                !props.entity.phone &&
                  !props.entity.email &&
                  !props.entity.address &&
                  'flex-col items-start justify-center',
              )}
            >
              {props?.entity?.name && (
                <div className="flex items-center gap-2 h-[15px] font-label font-medium uppercase text-[16px] text-white/80 leading-none max-sm:mb-3">
                  {props.entity.name}
                </div>
              )}

              {props?.entity?.type && (
                <div className="flex items-center justify-center w-auto h-[18px] px-2 bg-zinc-800 text-lime-300 text-xs rounded-full">
                  {props.entity.type.replaceAll('_', ' ').toUpperCase()}
                </div>
              )}
            </div>

            {props.entity.phone && <div className="text-white/90 text-[16px] font-medium leading-none">{phone}</div>}

            {props.entity.email && (
              <div className="text-white/70 text-sm font-normal leading-none">{props.entity?.email}</div>
            )}

            <div className="">
              {props?.entity?.address && (
                <Tooltip
                  content={props.entity?.address && props.entity.address.length > 28 ? props.entity.address : ''}
                >
                  <div className="truncate max-w-[200px] text-white/70 text-sm font-normal leading-none">
                    {props.entity?.address ? props.entity.address : '--'}
                  </div>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        <AlertDialog
          withPortal
          onConfirm={async () => {
            if (!props.entity?.id) return;

            props.deleteSelectedEntity(props.entity.id);
          }}
          isDelete
          title={`Delete entity?`}
          description={`This will remove this ${props.entity.type ?? 'entity'} from the project.`}
        >
          <Icon
            name="bin"
            className="absolute bottom-[18px] right-[12px] hidden w-[17px] h-[17px] text-zinc-500/70 hover:text-red-400 group-hover:block"
          />
        </AlertDialog>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => props.onSetSelected(props.entity.id)}
      className={cn(
        'group flex flex-col px-3 py-3 rounded-xl min-w-[200px] h-[115px] hover:bg-stone-500/20',
        // isDragging ? "cursor-grabbing" : "cursor-pointer",
        props.selected && 'bg-lime-300/10 hover:bg-lime-300/15',
      )}
      key={props.entity.id}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2 h-[15px] font-label font-medium uppercase text-sm text-white/80 mb-2 leading-none max-sm:mb-3',
          isDragging ? 'cursor-grabbing' : 'cursor-pointer',
          props.selected && 'text-lime-300',
        )}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-center gap-2">
          {props?.entity?.name && (
            <div className="flex items-center gap-2 h-[15px] font-label font-medium uppercase text-[16px] text-white/80 leading-none">
              {props.entity.name}
            </div>
          )}

          {props?.entity?.type && (
            <div className="flex items-center justify-center w-auto h-[18px] px-2 bg-zinc-800 text-lime-300 text-xs rounded-full">
              {props?.entity?.subtype
                ? props.entity.subtype.replaceAll('_', ' ')
                : props.entity.type.replaceAll('_', ' ')}
            </div>
          )}
        </div>

        <Icon
          name="drag"
          className={cn(
            'hidden w-4 h-4 text-stone-500/50 group-hover:block hover:text-stone-500/80',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
        />
      </div>

      <div className={cn('flex items-center gap-2', isDragging ? 'cursor-grabbing' : 'cursor-pointer')}>
        <Avatar className="w-[60px] h-[60px]">
          {props.entity.logo !== '' && (
            <AvatarImage
              src={props.entity.logo ?? ''}
              alt="Avatar"
              className="object-contain"
              onError={(e) => {
                //-- if image fails to load.
                e.currentTarget.style.display = 'none';
              }}
            />
          )}

          <AvatarFallback>
            <span className="text-base text-[34px]">{initials}</span>
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-start gap-2 w-full">
          <div className="text-white/70 text-sm font-normal leading-none">{phone ? phone : '--'}</div>

          <div className="text-white/70 text-sm font-normal leading-none">
            {props.entity?.email ? props.entity.email : '--'}
          </div>

          <div className="flex items-center justify-between w-full h-[17px]">
            <div
              className={cn(
                'flex items-center max-w-[250px] text-white/70 text-sm font-normal leading-none overflow-hidden text-ellipsis',
                props.entity?.address && props.entity.address.length > 25 && 'pt-3 leading-[17px]',
              )}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {props.entity?.address ? props.entity.address : '--'}
            </div>

            <AlertDialog
              withPortal
              onConfirm={async () => {
                if (!props.entity?.id) return;

                props.deleteSelectedEntity(props.entity.id);
              }}
              isDelete
              title={`Delete entity?`}
              description={`This will remove this ${props.entity.type ?? 'entity'} from the project.`}
            >
              <Icon
                name="bin"
                className="hidden w-[17px] h-[17px] text-zinc-500/70 hover:text-red-400 group-hover:block"
              />
            </AlertDialog>
            {/*<div*/}
            {/*  onClick={(e) => {*/}
            {/*    e.stopPropagation();*/}
            {/*    props.deleteSelectedEntity(props.entity.id);*/}
            {/*  }}*/}
            {/*  className="flex items-center gap-1 cursor-pointer"*/}
            {/*>*/}
            {/*  /!*<div className="text-sm text-zinc-500/80 group-hover:text-zinc-400/100">*!/*/}
            {/*  /!*  Remove*!/*/}
            {/*  /!*</div>*!/*/}

            {/*  */}
            {/*</div>*/}
          </div>
        </div>
      </div>
    </div>
  );
};
