import React, { FC, useEffect, useRef, useState } from "react";
import { cn, makeInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import {
  CallSheetMemberType,
  CompanyCrewMemberType,
  CompanyEntityType,
} from "@/types/type";
import { Icon } from "@/components/ui/Icon";

type Props = {
  className?: string;
  placeholder?: string;
  entitySuggestions: CompanyEntityType[];
  maxResults?: number;
  value?: string;
  onChange: (value: string) => void;
  onEntityClick: (entity: CompanyEntityType) => void;
  autoFocus?: boolean;
};

export const AutoCompleteEntity: FC<Props> = (props) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<
    CompanyEntityType[]
  >([]);
  const [userInput, setUserInput] = useState(props.value);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();

      setFocusedIndex((prevIndex) =>
        prevIndex < props.entitySuggestions.length - 1 ? prevIndex + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();

      setFocusedIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : props.entitySuggestions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();

      if (focusedIndex >= 0 && focusedIndex < props.entitySuggestions.length) {
        handleSuggestionSelect(props.entitySuggestions[focusedIndex]);
      }
    }
  };

  useEffect(() => {
    if (
      focusedIndex >= 0 &&
      suggestionRefs.current[focusedIndex] &&
      isDropdownOpen
    ) {
      suggestionRefs.current[focusedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [focusedIndex, isDropdownOpen]);

  const handleInputFocus = () => {
    setIsFocused(true);
    setIsDropdownOpen(true);
    setFocusedIndex(-1);
  };

  const handleInputBlur = () => {
    //-- setTimeout to allow click events to fire before closing dropdown.
    setTimeout(() => {
      setIsFocused(false);
      setIsDropdownOpen(false);
    }, 200);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    setShowSuggestions(true);

    const inputValue = e.target.value;

    setUserInput(inputValue);
    props.onChange(inputValue);

    if (!inputValue) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);

      return;
    }

    const filtered = props.entitySuggestions.filter(
      (suggestion) =>
        suggestion.name?.toLowerCase().startsWith(inputValue.toLowerCase()) //-- strict "starts with".
    );

    setFilteredSuggestions(filtered);
    // setShowSuggestions(filtered.length > 0);
  };

  const handleSuggestionSelect = (suggestion: CompanyEntityType) => {
    setUserInput(suggestion.name || "");

    props.onEntityClick(suggestion);

    setShowSuggestions(false);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div onKeyDown={handleKeyDown} className="relative">
      <input
        autoFocus={props.autoFocus}
        ref={inputRef}
        className={cn(
          "",
          props.className
          // isFocused && "border border-lime-300"
        )}
        placeholder={props.placeholder}
        type="text"
        value={userInput}
        onChange={handleChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
      />

      {showSuggestions && userInput && isDropdownOpen && (
        <div
          ref={suggestionsRef}
          className="z-50 absolute top-full mt-1 left-0 flex flex-col items-start w-full h-auto max-h-[200px] p-1 overflow-y-scroll rounded-lg bg-black/100 border border-white/10"
        >
          {filteredSuggestions.length ? (
            filteredSuggestions.map((suggestion, index) => {
              if (!suggestion.name) return null;

              const initials = makeInitials(suggestion.name);

              if (props.maxResults && index >= props.maxResults) return null;

              return (
                <div
                  ref={(el) => {
                    suggestionRefs.current[index] = el;
                  }}
                  className={cn(
                    "flex flex-col items-start justify-center w-full gap-[6px] px-2 py-1 rounded-lg cursor-pointer hover:bg-zinc-700/70",
                    focusedIndex === index && "bg-zinc-700/70"
                  )}
                  key={suggestion.id}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex items-center gap-[6px]">
                    <Avatar className="w-[22px] h-[22px]">
                      {suggestion.logo !== "" && (
                        <AvatarImage
                          src={suggestion.logo ?? ""}
                          alt="Avatar"
                          onError={(e) => {
                            //-- if image fails to load.
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}

                      <AvatarFallback>
                        <span className="text-base text-[34px]">
                          {initials}
                        </span>
                      </AvatarFallback>
                    </Avatar>

                    <div className="text-[13px]">{suggestion.name}</div>

                    {suggestion.email && (
                      <div className="text-[12px] text-zinc-600">
                        {`(${suggestion.email})`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-start justify-center w-full gap-[6px] py-1">
              <div className="flex items-center text-[14px]">
                <div className="px-2 py-1 text-zinc-500 font-medium">{`No matches for`}</div>
                <div className="text-zinc-300 font-medium">{` "${userInput}".`}</div>
              </div>

              {userInput.trim() !== "" && (
                <div
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center w-full px-2 py-1 text-[14px] text-zinc-300 cursor-pointer rounded-lg hover:bg-zinc-700/70"
                >
                  <Icon name="plus" className="w-4 h-4" />
                  <div className="mr-4">Add them</div>

                  <div className="flex items-center gap-[6px]">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="w-6 h-6">
                        <span className="text-[10px]">
                          {makeInitials(userInput)}
                        </span>
                      </AvatarFallback>
                    </Avatar>

                    <div className="text-[13px]">{userInput}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
