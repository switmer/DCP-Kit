import React, { useRef } from 'react';
import { Filter } from './Filter';
import { Icon } from '@/components/ui/Icon';

type LocationType = {
  label: string;
  locationIds: number[];
};

type SearchAndFilterProps = {
  search: string;
  setSearch: (search: string) => void;
  selectedLocations: string[];
  setSelectedLocations: React.Dispatch<React.SetStateAction<string[]>>;
  locations?: LocationType[];
  locationsLoading: boolean;
  positions: {
    position: string;
    aliases: string[];
  }[];
  selectedPositions: string[];
  setSelectedPositions: React.Dispatch<React.SetStateAction<string[]>>;
  selectedDepartment: string[];
  setSelectedDepartment: React.Dispatch<React.SetStateAction<string[]>>;
  departments: {
    label: string;
    value: string;
  }[];
};

export const SearchAndFilter = ({
  search,
  setSearch,
  selectedLocations,
  setSelectedLocations,
  locations,
  locationsLoading,
  positions,
  selectedPositions,
  setSelectedPositions,
  selectedDepartment,
  setSelectedDepartment,
  departments,
}: SearchAndFilterProps) => {
  return (
    <>
      <Search search={search} setSearch={setSearch}>
        {selectedLocations.map((location) => (
          <SelectedFilterPill
            key={location}
            label={location}
            onRemove={() => setSelectedLocations(selectedLocations.filter((l) => l !== location))}
          />
        ))}
        {selectedPositions.map((position) => (
          <SelectedFilterPill
            key={position}
            label={position}
            onRemove={() => setSelectedPositions(selectedPositions.filter((p) => p !== position))}
          />
        ))}
        {selectedDepartment.map((department) => (
          <SelectedFilterPill
            key={department}
            label={department}
            onRemove={() => setSelectedDepartment(selectedDepartment.filter((d) => d !== department))}
          />
        ))}
      </Search>
      <div className="flex gap-2">
        <Filter
          selectedValues={selectedPositions}
          setSelectedValues={setSelectedPositions}
          icon="usersAlternative"
          placeholder="Role"
          searchPlaceholder="Search roles"
          options={positions.map((p) => ({
            label: p.position,
            value: p.position,
          }))}
        />
        <Filter
          selectedValues={selectedDepartment}
          setSelectedValues={setSelectedDepartment}
          icon="usersAlternative"
          placeholder="Department"
          searchPlaceholder="Search departments"
          options={departments}
        />
        <Filter
          selectedValues={selectedLocations}
          setSelectedValues={setSelectedLocations}
          icon={'pinAlternative'}
          placeholder={'Location'}
          disabled={locationsLoading}
          searchPlaceholder={'Search locations...'}
          options={
            locations?.map((l) => ({
              label: l.label,
              value: l.label,
            })) ?? []
          }
        />
      </div>
    </>
  );
};

type SearchProps = {
  search: string;
  setSearch: (search: string) => void;
  children: React.ReactNode;
};

export const Search = ({ search, setSearch, children }: SearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="relative flex justify-start items-center pl-4 pr-0 overflow-hidden gap-2 cursor-text bg-white bg-opacity-10 rounded-xl w-full max-w-full"
      onClick={() => inputRef?.current?.focus()}
    >
      <div className="flex items-center gap-3 flex-1">
        <Icon name="search" className="text-stone-300 w-5 h-5 max-sm:w-3 max-sm:h-5" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={'Search crew...'}
          className="flex flex-1 h-10 bg-transparent border-0 text-base placeholder:text-stone-300 text-white max-sm:placeholder:text-sm"
        />
      </div>

      <div className="relative min-w-0 max-w-[380px]">
        <div className="absolute left-[-1px] top-0 bottom-0 w-4 bg-gradient-to-r from-[#272729] to-transparent pointer-events-none z-10"></div>
        <div className="flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbars">
          <div />
          {children}
          <div />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#272729] to-transparent pointer-events-none z-10"></div>
      </div>
    </div>
  );
};

type SelectedFilterPillProps = {
  label: string;
  onRemove: () => void;
};

export const SelectedFilterPill = ({ label, onRemove }: SelectedFilterPillProps) => {
  return (
    <span className="inline-flex items-center gap-1 px-2 h-7 bg-background rounded-lg text-sm">
      {label}
      <button className="hover:bg-white/10 rounded-full p-0.5" onClick={onRemove}>
        <Icon name="cross" className="w-3 h-3" />
      </button>
    </span>
  );
};
