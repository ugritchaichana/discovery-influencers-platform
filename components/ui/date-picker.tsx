"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Calendar, type CalendarProps } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type DatePickerProps = {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  calendarProps?: Omit<CalendarProps, "mode" | "selected" | "onSelect">;
  required?: boolean;
  fromYear?: number;
  toYear?: number;
  onCalendarSelect?: (date: Date | undefined) => void;
};

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled,
  calendarProps,
  fromYear,
  toYear,
  onCalendarSelect,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const displayLabel = useMemo(() => {
    if (!date) {
      return placeholder;
    }
    try {
      return format(date, "yyyy-MM-dd");
    } catch {
      return placeholder;
    }
  }, [date, placeholder]);

  const {
    fromYear: calendarFromYear,
    toYear: calendarToYear,
    captionLayout: calendarCaptionLayout,
    ...restCalendarProps
  } = calendarProps ?? {};
  const currentYear = new Date().getFullYear();
  const resolvedCaptionLayout = calendarCaptionLayout ?? "dropdown";
  const resolvedFromYear = fromYear ?? calendarFromYear ?? currentYear - 80;
  const resolvedToYear = toYear ?? calendarToYear ?? currentYear + 1;

  const handleSelect = (selectedDate?: Date) => {
    onDateChange(selectedDate);
    onCalendarSelect?.(selectedDate);
    if (selectedDate) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "flex w-full items-center justify-between border-white/15 bg-white/5 text-left text-sm font-normal text-white transition hover:border-white/30 hover:bg-white/10 disabled:border-white/10 disabled:bg-white/5 disabled:text-white/70 disabled:opacity-100",
            !date && "text-white/40"
          )}
          disabled={disabled}
        >
          <span>{displayLabel}</span>
          <CalendarIcon className="h-4 w-4 opacity-70" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          captionLayout={resolvedCaptionLayout}
          fromYear={resolvedFromYear}
          toYear={resolvedToYear}
          {...restCalendarProps}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
