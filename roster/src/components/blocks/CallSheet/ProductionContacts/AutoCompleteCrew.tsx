import React, { FC, useEffect, useRef, useState, useCallback } from 'react';
import { cn, makeInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { CallSheetMemberType, CompanyCrewMemberType } from '@/types/type';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { createPortal } from 'react-dom';

type Props = {
  className?: string;
  placeholder?: string;
  crewSuggestions: CallSheetMemberType[] | CompanyCrewMemberType[];
  useAllCrew: boolean;
  maxResults?: number;
  value?: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  onCrewClick: (crew: CallSheetMemberType | CompanyCrewMemberType) => void;
  onAddNewClick?: ({ name }: { name: string }, addNew: boolean) => void;
  autoFocus?: boolean;
  type?: 'table';
};

export const AutoCompleteCrew: FC<Props> = (props) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<CallSheetMemberType[] | CompanyCrewMemberType[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userInput, setUserInput] = useState(props.value);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionJustSelected, setSuggestionJustSelected] = useState(false);
  const [originalValue, setOriginalValue] = useState<string | undefined>(props.value);
  const [escapePressed, setEscapePressed] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // calculate dropdown position when showing suggestions (only for table type).
  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current || props.type !== 'table') return;

    const inputRect = inputRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const viewportHeight = window.innerHeight;

    // calculate space below and above the input.
    const spaceBelow = viewportHeight - inputRect.bottom;

    // max height of dropdown.
    const dropdownHeight = 200;

    // gap between input and dropdown.
    const gap = 4;

    // determine if drop down should appear below or above the input.
    const showBelow = spaceBelow >= dropdownHeight + gap;

    // generate a unique identifier for this instance.
    const instanceId = inputRef.current.getAttribute('data-instance-id') || Math.random().toString(36).substring(7);

    inputRef.current.setAttribute('data-instance-id', instanceId);

    // calculate position based on available space.
    const topPosition = showBelow
      ? // position below input.
        inputRect.bottom + scrollTop + gap
      : // position above input.
        inputRect.top + scrollTop - dropdownHeight - gap;

    console.log(`Updating dropdown position for instance ${instanceId}`, {
      top: topPosition,
      left: inputRect.left + scrollLeft,
      width: 350,
      showBelow,
    });

    setDropdownPosition({
      top: topPosition,
      left: inputRect.left + scrollLeft,
      width: 350,
    });
  }, [props.type]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prevIndex) => (prevIndex < filteredSuggestions.length - 1 ? prevIndex + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredSuggestions.length) {
        handleSuggestionSelect(filteredSuggestions[focusedIndex]);
      } else if (userInput && userInput.trim() !== '') {
        props.onChange(userInput);
        setIsDropdownOpen(false);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setUserInput(originalValue);
      setShowSuggestions(false);
      setIsDropdownOpen(false);
      setIsFocused(false);
      setEscapePressed(true);

      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current?.blur();
        }, 0);
      }
    }
  };

  useEffect(() => {
    if (focusedIndex >= 0 && suggestionRefs.current[focusedIndex] && isDropdownOpen) {
      suggestionRefs.current[focusedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedIndex, isDropdownOpen]);

  const handleInputFocus = () => {
    setIsFocused(true);
    setIsDropdownOpen(true);
    setFocusedIndex(-1);
    setOriginalValue(userInput);
    setEscapePressed(false);

    if (props.type === 'table') {
      // generate a unique identifier for this instance if it doesn't exist.
      if (inputRef.current && !inputRef.current.getAttribute('data-instance-id')) {
        const instanceId = Math.random().toString(36).substring(7);

        inputRef.current.setAttribute('data-instance-id', instanceId);
      }

      // force a recalculation of the dropdown position.
      setTimeout(() => {
        updateDropdownPosition();
      }, 0);
    }
  };

  const handleInputBlur = () => {
    const blurDelay = props.type === 'table' ? 150 : 100;

    setTimeout(() => {
      if (!escapePressed && props.onBlur) {
        props.onBlur(userInput || '');
      }
      setIsFocused(false);
      setShowSuggestions(false);
      setIsDropdownOpen(false);
      setEscapePressed(false);
    }, blurDelay);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!props.crewSuggestions) return;

    const inputValue = e.target.value;
    setUserInput(inputValue);

    if (!inputValue) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const isCallSheetMember = props.crewSuggestions[0] && 'call_sheet' in props.crewSuggestions[0];

    const filtered = props.crewSuggestions.filter((suggestion) => {
      if (!suggestion.name) return false;
      return suggestion.name.toLowerCase().indexOf(inputValue.toLowerCase()) > -1;
    });

    setFilteredSuggestions(
      isCallSheetMember ? (filtered as CallSheetMemberType[]) : (filtered as CompanyCrewMemberType[]),
    );

    setShowSuggestions(true);

    if (props.type === 'table') {
      // Force a recalculation of the dropdown position
      setTimeout(() => {
        updateDropdownPosition();
      }, 0);
    }
  };

  const handleSuggestionSelect = (suggestion: CallSheetMemberType | CompanyCrewMemberType) => {
    setUserInput(suggestion.name || '');
    setSuggestionJustSelected(true);
    props.onCrewClick(suggestion);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    setUserInput(props.value);
  }, [props.value]);

  // update dropdown position on scroll/resize (only for table type).
  useEffect(() => {
    if (!showSuggestions || !isDropdownOpen || props.type !== 'table') return;

    const handleScroll = () => {
      if (inputRef.current) {
        const instanceId = inputRef.current.getAttribute('data-instance-id') || 'unknown';
        console.log(`Window scrolled for instance ${instanceId}`);
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (inputRef.current) {
        const instanceId = inputRef.current.getAttribute('data-instance-id') || 'unknown';
        console.log(`Window resized for instance ${instanceId}`);
        updateDropdownPosition();
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showSuggestions, isDropdownOpen, updateDropdownPosition, props.type]);

  // handle clicks outside (only for non-table type).
  useEffect(() => {
    if (props.type === 'table') return; // skip for table type since we use portal.

    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [props.type]);

  // render dropdown content.
  const renderDropdownContent = () => (
    <>
      {filteredSuggestions.length ? (
        <>
          {filteredSuggestions.map((suggestion, index) => {
            if (!suggestion.name) return null;

            const initials = makeInitials(suggestion.name);

            if (props.maxResults && index >= props.maxResults) return null;

            return (
              <div
                ref={(el) => {
                  suggestionRefs.current[index] = el;
                }}
                className={cn(
                  'flex flex-col items-start justify-center w-full gap-[6px] px-2 py-1 rounded-lg cursor-pointer hover:bg-zinc-700/70',
                  focusedIndex === index && 'bg-zinc-700/70',
                )}
                key={suggestion.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur.
                  handleSuggestionSelect(suggestion);
                }}
              >
                <div className="flex items-center gap-[6px]">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="w-6 h-6">
                      <span className="text-[10px]">{initials}</span>
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-[13px]">{suggestion.name}</div>

                  {suggestion.email && <div className="text-[12px] text-zinc-600">{`(${suggestion.email})`}</div>}
                </div>
              </div>
            );
          })}

          {userInput && userInput.trim() !== '' && (
            <div
              onMouseDown={(e) => {
                // prevent input blur.
                e.preventDefault();

                props.onChange(userInput);

                props.onAddNewClick && props.onAddNewClick({ name: userInput }, true);

                setShowSuggestions(false);
                setIsDropdownOpen(false);
              }}
              className="flex items-center w-full px-2 py-1 text-[14px] text-zinc-300 cursor-pointer rounded-lg hover:bg-zinc-700/70"
            >
              <Icon name="plus" className="w-4 h-4" />
              <div className="mr-4">Add them</div>

              <div className="flex items-center gap-[6px]">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="w-6 h-6">
                    <span className="text-[10px]">{makeInitials(userInput)}</span>
                  </AvatarFallback>
                </Avatar>

                <div className="text-[13px]">{userInput}</div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="px-2 py-1 text-[13px] text-zinc-500">No suggestions found.</div>

          {userInput && (
            <div
              onMouseDown={(e) => {
                // prevent input blur.
                e.preventDefault();

                props.onChange(userInput);

                props.onAddNewClick && props.onAddNewClick({ name: userInput }, true);

                setShowSuggestions(false);
                setIsDropdownOpen(false);
              }}
              className="flex items-center w-full px-2 py-1 text-[14px] text-zinc-300 cursor-pointer rounded-lg hover:bg-zinc-700/70"
            >
              <Icon name="plus" className="w-4 h-4" />
              <div className="mr-4">Add them</div>

              <div className="flex items-center gap-[6px]">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="w-6 h-6">
                    <span className="text-[10px]">{makeInitials(userInput)}</span>
                  </AvatarFallback>
                </Avatar>

                <div className="text-[13px]">{userInput}</div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  // render dropdown using portal for table type, regular div for others
  const renderDropdown = () => {
    if (!showSuggestions || !userInput || !isDropdownOpen) return null;

    if (props.type === 'table') {
      if (!dropdownPosition) return null;

      // get the instance id from the input element.
      const instanceId = inputRef.current?.getAttribute('data-instance-id') || 'unknown';

      const dropdown = (
        <div
          ref={suggestionsRef}
          data-instance-id={instanceId}
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
          }}
          data-position={inputRef.current ? (dropdownPosition.top < inputRef.current.getBoundingClientRect().top ? 'above' : 'below') : 'below'}
          className="flex flex-col items-start h-auto max-h-[200px] p-1 overflow-y-scroll rounded-lg bg-zinc-900 border border-white/10"
        >
          {renderDropdownContent()}
        </div>
      );

      return typeof document !== 'undefined' ? createPortal(dropdown, document.body) : dropdown;
    }

    // regular dropdown for non-table usage.
    return (
      <div
        ref={suggestionsRef}
        className={cn(
          'z-1000 absolute top-full mt-1 left-0 flex flex-col items-start w-[120%] h-auto max-h-[200px] p-1 overflow-y-scroll rounded-lg bg-black/100 border border-white/10',
        )}
      >
        {renderDropdownContent()}
      </div>
    );
  };

  return (
    <div onKeyDown={handleKeyDown} className="relative flex items-center">
      {props.type === 'table' && !props.value && (
        <Icon name="search" className="z-10 absolute left-[8px] w-4 h-4 text-opacity-60 text-white" />
      )}

      <input
        autoFocus={props.autoFocus}
        ref={inputRef}
        className={cn(
          'flex items-center w-auto h-8 px-2 text-base text-white text-opacity-95 leading-tight rounded-lg duration-150 cursor-text border border-transparent hover:bg-zinc-900',
          props.className,
          isFocused && 'border border-lime-300 bg-zinc-900',
          props.type === 'table' && !props.value && 'pl-9',
        )}
        placeholder={props.placeholder}
        type="text"
        value={userInput}
        onChange={handleChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
      />

      {renderDropdown()}
    </div>
  );
};
