"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COMMON_CURRENCIES } from "@/lib/form-options";

interface CurrencySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  triggerClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CurrencySelect({
  value,
  onValueChange,
  triggerClassName,
  placeholder = "Select currency",
  disabled = false,
}: CurrencySelectProps) {
  const options = useMemo(() => {
    const normalizedValue = value?.trim().toUpperCase();

    if (!normalizedValue || COMMON_CURRENCIES.some((option) => option.code === normalizedValue)) {
      return COMMON_CURRENCIES;
    }

    return [
      { code: normalizedValue, name: "Custom currency", symbol: normalizedValue },
      ...COMMON_CURRENCIES,
    ];
  }, [value]);

  return (
    <Select
      value={value?.trim().toUpperCase() || "INR"}
      onValueChange={(nextValue) => nextValue && onValueChange(nextValue)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[160px]", triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.code} value={option.code}>
            <span className="flex min-w-0 items-center justify-between gap-3">
              <span className="font-medium">{option.code}</span>
              <span className="truncate text-xs text-muted-foreground">{option.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}