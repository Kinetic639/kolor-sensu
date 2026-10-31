"use client";

import { useEffect, useRef, useState } from "react";
import {
  CompactBookingCalendar,
  type CompactBookingSelection,
  type CompactBookingService,
} from "@repo/ui/public-site/compact-booking-calendar";
import type { AvailabilityChoice } from "@repo/ui/public-site/availability-calendar";
import { dateLabel } from "@repo/ui/public-site/availability-calendar-dates";
import { useRouter } from "next/navigation";
import { bookingHandoffHref } from "./booking-handoff";
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
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [tab, setTab] = useState<"calendar" | "services">("calendar");
  const [serviceSlug, setServiceSlug] = useState("");
  const [choice, setChoice] = useState<AvailabilityChoice | null>(null);
  const service = services.find((one) => one.slug === serviceSlug);
  const selection: CompactBookingSelection = {
    service: serviceSlug,
    mode: "stacjonarnie",
    location: "",
  };
  const query = new URLSearchParams({
    specjalista: specialistSlug,
    ...(serviceSlug ? { usluga: serviceSlug } : {}),
  }).toString();
  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(!!entry?.isIntersecting);
      },
      { rootMargin: "1000px" },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    root.current
      ?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
      ?.focus({ preventScroll: true });
  }, [tab]);
  const openWizard = (slug: string, chosen: AvailabilityChoice) => {
    if (chosen.slot.options?.some((option) => option.service === slug))
      router.push(
        bookingHandoffHref(specialistSlug, slug, chosen.date, chosen.slot.time),
      );
  };
  const change = (patch: Partial<CompactBookingSelection>) => {
    if (patch.service !== undefined) {
      setServiceSlug(patch.service);
      if (choice) openWizard(patch.service, choice);
    }
  };
  return (
    <div ref={root}>
      <CompactBookingCalendar
        specialistName={specialistName}
        services={services}
        locations={locations}
        selection={selection}
        onChange={change}
        activeTab={tab}
        onTabChange={setTab}
        hasSelectedTime={!!choice}
        availableServiceSlugs={choice?.slot.options?.map((one) => one.service)}
        calendar={
          <AvailabilityCalendarClient
            query={query}
            endpoint="/api/booking/specialist-preview"
            rangeRequests
            today={today}
            lastDay={lastDay}
            active={active && tab === "calendar"}
            onChoose={(next) => {
              setChoice(next);
              if (serviceSlug) openWizard(serviceSlug, next);
              else setTab("services");
            }}
          />
        }
        bookingSummary={
          choice || service ? (
            <div
              className="ks-booking-mini__summary"
              aria-label="Wybrana wizyta"
            >
              <div
                className="ks-booking-mini__summary-selections"
                aria-live="polite"
              >
                {service ? (
                  <button
                    type="button"
                    aria-label="Zmień usługę"
                    onClick={() => {
                      setServiceSlug("");
                      setChoice(null);
                      setTab("services");
                    }}
                  >
                    <strong>{service.name}</strong>
                    <span aria-hidden="true"> · zmień</span>
                  </button>
                ) : null}
                {choice ? (
                  <button
                    type="button"
                    aria-label="Zmień termin"
                    onClick={() => {
                      setChoice(null);
                      setTab("calendar");
                    }}
                  >
                    {dateLabel(choice.date, { day: "numeric", month: "short" })}{" "}
                    · {choice.slot.time}
                    <span aria-hidden="true"> · zmień</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
