"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import type { LocationOption } from "./loaders";

export function LocationSelect({
  id,
  value,
  onChange,
  locations,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  locations: LocationOption[];
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        id={id}
      >
        <SelectValue placeholder="Wybierz lokalizację" />
      </SelectTrigger>
      <SelectContent>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
