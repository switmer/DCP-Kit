'use client';

import './styles.css';
import React, { FC, useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

type Props = {
  positioning?: 'crewing' | 'dashboard' | 'edit-details';
  field: any;
  form: any;
  values: any;
  type: 'shoot' | 'prep' | 'post';
  classNames?: string;
  setShowDatePicker: (bool: boolean, type: 'shoot' | 'prep' | 'post') => void;
  setRangeDatesCallback?: (range: { from: Date; to: Date }, type: 'shoot' | 'prep' | 'post') => void;
};

export const Calendar: FC<Props> = (props) => {
  const { value, name } = props.field;
  const { setFieldValue } = props.form;

  const [initialDate, setInitialDate] = useState<{ from: Date; to: Date }>(getInitialDate());

  const calendarRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
      props.setShowDatePicker(false, props.type);
    }
  };

  function isFormattedDate(date: string): boolean {
    const regex = /^\d{2}-\d{2}-\d{2}$/;

    return regex.test(date) && !isNaN(new Date(date).getTime());
  }

  function getInitialDate() {
    // handle null, undefined, or empty array values.
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return { from: new Date(), to: new Date() };
    }

    // handle range object with from/to properties.
    if (value.from || value.to) {
      return {
        from: value.from || new Date(),
        to: value.to || value.from || new Date(),
      };
    }

    // handle empty array or object without from/to and length.
    if (!Array.isArray(value) || !value.length) {
      return { from: new Date(), to: new Date() };
    }

    // handle array of dates.
    try {
      if (!isFormattedDate(value[0])) {
        return {
          from: new Date(value[0]),
          to: new Date(value[value.length - 1]),
        };
      }

      return {
        from: new Date(value[0]),
        to: new Date(value[value.length - 1]),
      };
    } catch (error) {
      // fallback to current date.
      return { from: new Date(), to: new Date() };
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!value) return;

    // Update initialDate whenever value changes
    setInitialDate(getInitialDate());
  }, [value]);

  const handleSelect = (range: any) => {
    if (!range) {
      return;
    }

    setInitialDate(range);
    setFieldValue(name, range);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    // e.stopPropagation();

    if (!value) {
      props.setRangeDatesCallback && props.setRangeDatesCallback({ from: new Date(), to: new Date() }, props.type);

      props.setShowDatePicker?.(false, props.type);

      return;
    }

    //-- if no "from" date, default to now.
    if (!value.from) value.from = new Date();

    //-- if no "to" date, default to "from" date.
    if (!value.to) value.to = value.from;

    // setInitialDate(value);

    props.setRangeDatesCallback && props.setRangeDatesCallback(value, props.type);

    props.setShowDatePicker?.(false, props.type);
  };

  return (
    <div
      ref={calendarRef}
      className={cn('absolute z-50 flex w-[310px] h-[350px] bg-stone-900/100 rounded-lg', props.classNames)}
    >
      <DayPicker mode="range" selected={initialDate} onSelect={handleSelect} defaultMonth={initialDate.from ?? null} />

      <Button
        variant="accent"
        onClick={(e) => handleSubmit(e)}
        className="relative right-[101px] top-[300px] h-[30px] text-[13px] rounded-md"
      >
        Submit
      </Button>
    </div>
  );
};
