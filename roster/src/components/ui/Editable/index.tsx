import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import React, { useEffect, useMemo, useState } from 'react';
import PhoneInput, { parsePhoneNumber } from 'react-phone-number-input/input';
import { Tooltip } from '../Tooltip';
import { cn } from '@/lib/utils';

type EditableInputProps = {
  type: string;
  value: any;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className: string;
  autoFocus: boolean;
  updatedTime?: string;
  compact?: boolean;
};

export const Editable: React.FC<{
  value?: any;
  type?: string;
  onChange: (v: any) => void;
  options?: string[];
  className?: string;
  tooltipCn?: string;
  tooltip?: string;
  updatedTime?: string;
  compact?: boolean;
}> = ({ value, type = 'text', onChange, options, className, updatedTime, compact }) => {
  const [isEditing, setEditing] = useState(false);
  const [v, setV] = useState(value);

  useEffect(() => {
    setV(value);
    setEditing(false);
  }, [value]);

  const [EditComponent, props] = useMemo(() => {
    const defaultProps: EditableInputProps = {
      type,
      value: v,
      onBlur: () => {
        if (v !== value) {
          onChange(v);
        }
        setEditing(false);
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          if (v !== value) {
            onChange(v);
          }
          setEditing(false);
        }
      },
      className: cn(
        'z-10 relative flex h-8 w-auto px-2 items-center bg-white bg-zinc-900 text-white text-opacity-95 text-base rounded-lg border border-lime-300',
        compact && type === 'tel' && 'min-w-[150px] ',
        compact && type === 'time' && 'min-w-[80px] ',
        type === 'email' && 'min-w-[200px] ',
        className,
      ),
      autoFocus: true,
    };

    switch (type) {
      case 'tel':
        return [PhoneInput, { ...defaultProps, defaultCountry: 'US' }] as const;
      case 'time':
        return [TimeInput, defaultProps] as const;
      default:
        return ['input', defaultProps] as const;
    }
  }, [type, v, className, value, onChange]);

  const formattedValue = useMemo(() => {
    if (type === 'tel') {
      try {
        const parsedPhone = parsePhoneNumber(v as string, 'US');

        return parsedPhone?.formatNational();
      } catch {
        return v;
      }
    }

    return v;
  }, [v, type]);

  if (type === 'select') {
    return (
      <DropdownMenu>
        <Tooltip content="Click to edit">
          <DropdownMenuTrigger className="text-white h-8 px-2 flex items-center text-opacity-95 text-base leading-tight">
            {v}
          </DropdownMenuTrigger>
        </Tooltip>

        <DropdownMenuContent className="grid gap-1 z-[100]">
          {(options ?? []).map((t) => {
            return (
              <DropdownMenuItem
                onClick={() => {
                  setV(t);
                  onChange(t);
                }}
                className={cn(value === t && 'focus:bg-lime-300 bg-lime-300 bg-opacity-10 text-lime-300')}
                key={t}
              >
                {t}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return isEditing ? (
    <div
      className={cn(
        "relative w-auto before:content-[''] before:absolute before:bg-[#3E4035] before:rounded-lg before:z-0 before:top-[-4px] before:left-[-4px] before:bottom-[-4px] before:right-[-4px]",
        compact && type === 'tel' && 'min-w-[150px] w-[150px]',
        compact && type === 'time' && 'min-w-[80px] w-[80px]',
        type === 'email' && 'min-w-[200px] w-[200px]',
        className,
      )}
    >
      {/* @ts-ignore */}
      <EditComponent
        {...props}
        onChange={(val) => {
          if (type === 'tel') {
            setV(val ?? '');
            return;
          }
          /* @ts-ignore */
          setV(val?.target?.value);
        }}
      />
    </div>
  ) : (
    <Tooltip content="Click to edit">
      <div
        className={cn(
          'flex items-center w-auto h-8 px-2 text-base text-white text-opacity-95 leading-tight rounded-lg duration-150 cursor-text border border-transparent hover:bg-zinc-900',
          compact && type === 'tel' && 'min-w-[150px] w-[150px]',
          compact && type === 'time' && 'min-w-[80px] w-[80px]',
          type === 'email' && 'min-w-[200px] w-[200px]',
          className,
        )}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {type === 'time' && updatedTime && updatedTime !== formattedValue ? (
          <div className="flex gap-2 items-center">
            <span className="line-through text-[rgba(255,255,255,0.6)] text-xs">{formattedValue}</span>
            {updatedTime}
          </div>
        ) : !!formattedValue ? (
          formattedValue
        ) : (
          '--'
        )}
      </div>
    </Tooltip>
  );
};

const TimeInput: React.FC<EditableInputProps & { onChange: (v: any) => void }> = ({
  value,
  onBlur,
  onKeyDown,
  onChange,
  className,
  autoFocus,
}) => {
  const [inputValue, setInputValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Validate and format the input
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
    const perRegex = /^PER\s.+$/i;

    let formattedValue = newValue;
    if (newValue === 'O/C' || newValue === 'N/C' || perRegex.test(newValue)) {
      formattedValue = newValue.toUpperCase();
    } else if (timeRegex.test(newValue)) {
      formattedValue = newValue.replace(/^(\d{1}:)/, '0$1').toUpperCase();
    }

    // Always fire onChange with the current value
    onChange({ target: { value: formattedValue } });
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={className}
      autoFocus={autoFocus}
    />
  );
};
