'use client';

import * as React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type Option = {
  label: string;
  value: string;
};

export function Filter({
  options,
  placeholder,
  searchPlaceholder,
  icon,
  disabled,
  selectedValues,
  setSelectedValues,
}: {
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  icon: string;
  disabled?: boolean;
  selectedValues: string[];
  setSelectedValues: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [open, setOpen] = React.useState(false);

  const labelText = React.useMemo(() => {
    if (selectedValues.length === 0) return placeholder;

    return selectedValues.map((v) => options.find((o) => o.value === v)?.label).join(', ');
  }, [selectedValues, options, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger disabled={disabled} asChild>
        <button
          className={cn(
            'flex max-w-[260px] items-center text-base gap-2 bg-transparent text-white  font-semibold border border-white border-opacity-10 hover:bg-white/10 hover:border-opacity-0 duration-100 rounded-full h-10 px-3',
            disabled && 'cursor-not-allowed hover:bg-transparent hover:border-opacity-10',
            open && 'bg-white/10 hover:bg-white/10 border-opacity-0',
          )}
        >
          {icon && <Icon name={icon} className="w-4 h-4 min-w-4" />}
          <div className="text-ellipsis overflow-hidden whitespace-nowrap">{labelText}</div>
          {!!selectedValues.length ? (
            <div
              className="flex gap-2 items-center"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedValues([]);
                setOpen(false);
              }}
            >
              <div className="h-5 w-[1px] bg-white/10" />
              <Icon name="plus" className="w-5 h-5 min-w-5 rotate-45 text-white/70 hover:text-white duration-100" />
            </div>
          ) : (
            <Icon name="chevron-small" className="w-5 h-5 min-w-5 text-white rotate-90" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" portless className="w-[240px] p-0">
        <Command className="bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[240px]">
          <CommandInput placeholder={searchPlaceholder ?? 'Search...'} className="h-9" />
          <CommandList>
            <CommandEmpty className="text-sm text-white/40 p-4">No results.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = selectedValues.includes(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    selected={selected}
                    onSelect={(currentValue) => {
                      setSelectedValues((prev) =>
                        prev.includes(currentValue)
                          ? prev.filter((item) => item !== currentValue)
                          : [...prev, currentValue],
                      );
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 justify-between max-w-full">
                      <div className="text-ellipsis overflow-hidden whitespace-nowrap">{option.label}</div>
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
  );
}
