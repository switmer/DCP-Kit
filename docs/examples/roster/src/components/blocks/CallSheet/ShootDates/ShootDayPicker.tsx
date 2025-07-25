"use client";

import React, { FC, useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

type Props = {
  field: any;
  form: any;
  values: any;
  classNames?: string;
  setShowDatePicker?: (bool: boolean) => void;
  handleSelect: (date: Date) => void;
};

export const ShootDayPicker: FC<Props> = (props) => {
  const { value, name } = props.field;
  const calendarRef = useRef<HTMLDivElement>(null);
  const [initialDate, setInitialDate] = useState<Date>(
    value ? new Date(value) : new Date()
  );

  const handleClickOutside = (event: MouseEvent) => {
    if (
      calendarRef.current &&
      !calendarRef.current.contains(event.target as Node)
    ) {
      props.setShowDatePicker && props.setShowDatePicker(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update initialDate whenever value changes
  useEffect(() => {
    if (value) {
      setInitialDate(new Date(value));
    }
  }, [value]);

  const handleSelect = (date: Date) => {
    if (!date) {
      return;
    }

    props.handleSelect(date);
  };

  return (
    <div
      ref={calendarRef}
      className={cn(
        "absolute z-50 flex w-[310px] h-[350px] bg-stone-900/100 rounded-lg",
        props.classNames
      )}
    >
      <DayPicker
        mode="single"
        selected={initialDate}
        onSelect={(v) => handleSelect(v as Date)}
        defaultMonth={initialDate ?? new Date()}
      />

      {/*<Button*/}
      {/*  variant="accent"*/}
      {/*  onClick={(e) => handleSubmit(e)}*/}
      {/*  className="relative right-[101px] top-[300px] h-[30px] text-[13px] rounded-md"*/}
      {/*>*/}
      {/*  Submit*/}
      {/*</Button>*/}
    </div>
  );
};
