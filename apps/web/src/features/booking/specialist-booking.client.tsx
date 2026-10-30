"use client";

import { useEffect, useRef, useState } from "react";
import {
  CompactBookingCalendar,
  type CompactBookingSelection,
  type CompactBookingService,
} from "@repo/ui/public-site/compact-booking-calendar";
import { AvailabilityCalendarClient } from "./availability-calendar.client";

export function SpecialistBookingClient({
  specialistSlug,
  specialistName,
  services,
  locations,
  today,
  lastDay,
}: {
  specialistSlug: string;
  specialistName: string;
  services: CompactBookingService[];
  locations: { slug: string; name: string }[];
  today: string;
  lastDay: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const initialService =
    services.find((service) => service.slug === "konsultacja-psychologiczna") ??
    services[0]!;
  const [selection, setSelection] = useState<CompactBookingSelection>({
    service: initialService.slug,
    mode: initialService.modes[0]!,
    location: locations[0]?.slug ?? "",
  });
  const query = new URLSearchParams({
    usluga: selection.service,
    specjalista: specialistSlug,
    forma: selection.mode,
    ...(selection.mode === "stacjonarnie" && selection.location
      ? { lokalizacja: selection.location }
      : {}),
  }).toString();
  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const change = (patch: Partial<CompactBookingSelection>) => {
    setSelection((current) => {
      const service = services.find(
        (one) => one.slug === (patch.service ?? current.service),
      )!;
      const mode = patch.mode ?? current.mode;
      return {
        ...current,
        ...patch,
        mode: service.modes.includes(mode) ? mode : service.modes[0]!,
      };
    });
  };
  return (
    <div ref={root}>
      <CompactBookingCalendar
        specialistName={specialistName}
        services={services}
        locations={locations}
        selection={selection}
        onChange={change}
        calendar={
          <AvailabilityCalendarClient
            key={query}
            query={query}
            today={today}
            lastDay={lastDay}
            active={active}
          />
        }
      />
    </div>
  );
}
