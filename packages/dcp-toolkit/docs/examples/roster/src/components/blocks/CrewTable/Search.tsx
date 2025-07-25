import { Icon } from "@/components/ui/Icon";
import { useRef } from "react";

interface SearchProps {
  search: string;
  setSearch: (search: string) => void;
  placeholder?: string | null;
}

export const Search: React.FC<SearchProps> = ({
  search,
  setSearch,
  placeholder,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="relative flex flex-1 justify-start items-center h-12 px-4 py-3 gap-3 cursor-text bg-neutral-700 bg-opacity-25 rounded-lg"
      onClick={() => inputRef?.current?.focus()}
    >
      <Icon
        name="search"
        className="text-stone-300 w-6 h-6 max-sm:w-4 max-sm:h-6"
      />
      <input
        ref={inputRef}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder ?? "Search for people, roles or companies"}
        className="flex flex-1 h-12 bg-transparent border-0 text-base placeholder:text-stone-300 text-white max-sm:placeholder:text-sm"
      />
    </div>
  );
};
