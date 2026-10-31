"use client";

import { useEffect, useRef, useState } from "react";
import {
  CompactBookingCalendar,
  type CompactBookingSelection,
  type CompactBookingService,
} from "@repo/ui/public-site/compact-booking-calendar";
import type { AvailabilityChoice } from "@repo/ui/public-site/availability-calendar";
import { dateLabel } from "@repo/ui/public-site/availability-calendar-dates";
import { HanddrawnLink } from "@repo/ui/public-site/handdrawn-link";
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
  const summary = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [tab, setTab] = useState<"calendar" | "services">("calendar");
  const [serviceSlug, setServiceSlug] = useState("");
  const [choice, setChoice] = useState<AvailabilityChoice | null>(null);
  const [optionHref, setOptionHref] = useState("");
  const service = services.find((one) => one.slug === serviceSlug);
  const options =
    choice?.slot.options?.filter((one) => one.service === serviceSlug) ?? [];
  const option =
    options.length === 1
      ? options[0]
      : options.find((one) => one.href === optionHref);
  const selection: CompactBookingSelection = {
    service: serviceSlug,
    mode: option?.mode ?? "stacjonarnie",
    location: option?.location ?? "",
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
    if (choice && service) {
      summary.current?.focus({ preventScroll: true });
      summary.current?.scrollIntoView?.({
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
          .matches
          ? "instant"
          : "smooth",
        block: "nearest",
      });
    }
  }, [choice, service]);
  useEffect(() => {
    root.current
      ?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
      ?.focus({ preventScroll: true });
  }, [tab]);
  const optionLabel = (one: (typeof options)[number]) =>
    one.mode === "online"
      ? "Online"
      : `Stacjonarnie · ${locations.find((location) => location.slug === one.location)?.name ?? "Gabinet"}`;
  const change = (patch: Partial<CompactBookingSelection>) => {
    if (patch.service !== undefined) {
      setServiceSlug(patch.service);
      setOptionHref("");
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
              setOptionHref("");
              if (!serviceSlug) setTab("services");
            }}
          />
        }
        bookingSummary={
          choice || service ? (
            <div
              ref={summary}
              tabIndex={-1}
              className="ks-booking-mini__summary"
              aria-label="Wybrana wizyta"
            >
              <div
                className="ks-booking-mini__summary-selections"
                aria-live="polite"
              >
                {service ? (
                  <p>
                    <strong>{service.name}</strong> ·{" "}
                    {service.price ?? service.detail}
                    {service.duration ? ` · ${service.duration}` : ""}
                  </p>
                ) : (
                  <p>Wybierz usługę dla tego terminu.</p>
                )}
                {choice ? (
                  <p>
                    {dateLabel(choice.date, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {choice.slot.time}
                  </p>
                ) : (
                  <p>Wybierz dostępną datę i godzinę w terminarzu.</p>
                )}
              </div>
              {choice && service && options.length > 1 ? (
                <label className="ks-booking-mini__summary-format">
                  Forma i miejsce spotkania
                  <select
                    value={option?.href ?? ""}
                    onChange={(event) => setOptionHref(event.target.value)}
                  >
                    <option value="" disabled>
                      Wybierz formę spotkania
                    </option>
                    {options.map((one) => (
                      <option key={one.href} value={one.href}>
                        {optionLabel(one)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : option ? (
                <p>{optionLabel(option)}</p>
              ) : null}
              <div className="ks-booking-mini__summary-actions">
                {choice ? (
                  <button
                    type="button"
                    onClick={() => {
                      setChoice(null);
                      setOptionHref("");
                      setTab("calendar");
                    }}
                  >
                    Zmień termin
                  </button>
                ) : null}
                {service ? (
                  <button
                    type="button"
                    onClick={() => {
                      setServiceSlug("");
                      setChoice(null);
                      setOptionHref("");
                      setTab("services");
                    }}
                  >
                    Zmień usługę
                  </button>
                ) : null}
                {option ? (
                  <HanddrawnLink href={option.href}>
                    Przejdź do rezerwacji
                  </HanddrawnLink>
                ) : null}
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
