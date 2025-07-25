import { Checkbox } from '@/components/ui/Checkbox';
import { CrewMember } from '.';
import { LocationGroup } from '@/queries/get-location-filter';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCrewStore } from '@/store/crew';
import { Tooltip } from '@/components/ui/Tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { capitalizeString, cn, makeInitials } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';

export const Member = ({
  crewMember,
  checked,
  setCheckedCrew,
  locations,
}: {
  crewMember: CrewMember;
  checked: boolean;
  setCheckedCrew: (checked: boolean) => void;
  locations?: LocationGroup[];
}) => {
  const { searchIndex } = useCrewStore();

  const displayLocations = useMemo(() => {
    if (!locations || !locations.length) return;

    const locationIds = crewMember?.call_sheet_member
      ?.map((c) => {
        return c.call_sheet.call_sheet_location.map((l) => l.location.id);
      })
      ?.flat();

    return locations.filter((l) => l.locationIds.some((id) => locationIds.includes(id)))?.map((l) => l.label);
  }, [crewMember?.call_sheet_member, locations]);

  const displayPositions = useMemo(() => {
    const seen = new Set<string>();
    return crewMember?.position
      ?.map((p) => {
        const found = searchIndex.get(p.name ?? '');

        if (!found) {
          const result = capitalizeString(p.name ?? '');
          if (seen.has(result)) return null;
          seen.add(result);

          return result;
        }

        if (seen.has(found?.position ?? '')) return null;
        seen.add(found?.position ?? '');

        return found?.position;
      })
      ?.filter((p) => !!p);
  }, [crewMember?.position, searchIndex]);

  const positionsToDisplay = useMemo(() => {
    if (!displayPositions || displayPositions.length === 0) return '';

    if (displayPositions.length === 1) return displayPositions[0];

    return `${displayPositions[0]}, +${displayPositions.length - 1} more`;
  }, [displayPositions]);

  const locationsToDisplay = useMemo(() => {
    if (!displayLocations || displayLocations.length === 0) return '';

    if (displayLocations.length === 1) return displayLocations[0];

    return `${displayLocations[0]}, +${displayLocations.length - 1} more`;
  }, [displayLocations]);

  const allPositionsText = useMemo(() => {
    return displayPositions?.join(', ') || '';
  }, [displayPositions]);

  const allLocationsText = useMemo(() => {
    return displayLocations?.join(', ') || '';
  }, [displayLocations]);

  return (
    <label
      className="flex items-center gap-4 p-3 rounded-lg transition-colors
                      hover:bg-white/5 cursor-pointer"
    >
      <div className="w-6 h-6 flex items-center justify-center">
        <Checkbox checked={checked} onCheckedChange={setCheckedCrew} />
      </div>
      <Avatar>
        <AvatarFallback>
          <span>{makeInitials(crewMember.name ?? '--')}</span>
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1/2">
        <div className="font-medium">{crewMember.name}</div>
        <div className="text-sm text-white/40">
          {displayPositions && displayPositions.length > 0 && (
            <>
              {displayPositions.length > 1 ? (
                <Tooltip content={allPositionsText}>
                  <span>{positionsToDisplay}</span>
                </Tooltip>
              ) : (
                <span>{positionsToDisplay}</span>
              )}
            </>
          )}

          {displayPositions && displayPositions.length > 0 && displayLocations && displayLocations.length > 0 && (
            <span> • </span>
          )}

          {displayLocations && displayLocations.length > 0 && (
            <>
              {displayLocations.length > 1 ? (
                <Tooltip content={allLocationsText}>
                  <span>{locationsToDisplay}</span>
                </Tooltip>
              ) : (
                <span>{locationsToDisplay}</span>
              )}
            </>
          )}
        </div>
      </div>
    </label>
  );
};

export const MemberSkeleton = () => {
  return (
    <div className="flex items-center gap-4 p-2 rounded-lg h-[68px]">
      <div className="w-6 h-6 flex items-center justify-center">
        <Checkbox checked={false} onCheckedChange={() => {}} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="font-medium">
          <Skeleton className="w-[180px] h-3" />
        </div>
        <div className="text-sm text-white/40">
          <Skeleton className="w-[280px] h-2.5" />
        </div>
      </div>
    </div>
  );
};

export const SelectedMember = ({
  crewMember,
  unCheck,
  position,
  updatePosition,
}: {
  crewMember: CrewMember;
  unCheck: () => void;
  position?: string;
  updatePosition: (crewMember: CrewMember) => void;
}) => {
  const [open, setOpen] = useState(false);
  const { searchIndex } = useCrewStore();

  const displayPositions = useMemo(() => {
    const seen = new Set<string>();
    return crewMember?.position
      ?.map((p) => {
        const found = searchIndex.get(p.name ?? '');

        if (!found) {
          const result = capitalizeString(p.name ?? '');
          if (seen.has(result)) return null;
          seen.add(result);

          return result;
        }

        if (seen.has(found?.position ?? '')) return null;
        seen.add(found?.position ?? '');

        return found?.position?.trim();
      })
      ?.filter((p) => !!p);
  }, [crewMember?.position, searchIndex]);

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-transparent border border-white/10">
      <div className="flex items-center gap-3">
        <Avatar size="small">
          <AvatarFallback>
            <span>{makeInitials(crewMember.name ?? '--')}</span>
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="font-medium text-sm">{crewMember.name}</div>
          <Popover
            open={open}
            onOpenChange={(open) => {
              if (position) {
                return;
              }
              setOpen(open);
            }}
          >
            <PopoverTrigger asChild>
              <div>
                <div
                  className={cn(
                    'text-xs gap-0.5 text-white/40 rounded-lg px-1 -ml-1 flex items-center justify-self-start',
                    !position && 'hover:bg-white/5 cursor-pointer',
                  )}
                >
                  {(position ? [position] : displayPositions?.length ? displayPositions : ['--'])?.[0]}

                  {!position && <Icon name="chevron-small" className="w-3 h-3 rotate-90 mt-[1px]" />}
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent align="start" portless className="w-[240px] p-0">
              <Command className="bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[240px]">
                <CommandInput placeholder="Search..." />
                <CommandList>
                  <CommandEmpty className="text-sm text-white/40 p-4">No positions</CommandEmpty>
                  <CommandGroup>
                    {displayPositions.map((option) => {
                      if (!option) return null;

                      const selected = position ? position === option : displayPositions?.[0] === option;

                      return (
                        <CommandItem
                          key={option}
                          value={option}
                          selected={selected}
                          onSelect={(currentValue) => {
                            const selectedPosition = crewMember.position.find(
                              (p) => p.name === currentValue?.toLocaleLowerCase(),
                            );

                            if (!selectedPosition) {
                              setOpen(false);
                              return;
                            }

                            updatePosition({
                              ...crewMember,
                              position: [
                                selectedPosition,
                                ...crewMember.position.filter((p) => p.name !== selectedPosition.name),
                              ],
                            });
                            setOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2 justify-between max-w-full">
                            <div className="text-ellipsis overflow-hidden whitespace-nowrap">{option}</div>
                            {selected && <Icon name="checkmark-alternative" className="w-4 h-4 text-accent" />}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <button className="hover:text-white/50 duration-100 w-6 h-6 flex items-center justify-center" onClick={unCheck}>
        <Icon name="cross" className="w-4 h-4" />
      </button>
    </div>
  );
};
