"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export type CompactBookingMode = "stacjonarnie" | "online";
export interface CompactBookingService {
  slug: string;
  name: string;
  detail: string;
  price?: string;
  duration?: string;
  description?: string | null;
  modes: CompactBookingMode[];
}
export interface CompactBookingSelection {
  service: string;
  mode: CompactBookingMode;
  location: string;
}
export interface CompactBookingCalendarProps {
  specialistName: string;
  services: CompactBookingService[];
  locations: { slug: string; name: string }[];
  selection: CompactBookingSelection;
  onChange: (patch: Partial<CompactBookingSelection>) => void;
  calendar: ReactNode;
  activeTab?: "calendar" | "services";
  onTabChange?: (tab: "calendar" | "services") => void;
  hasSelectedTime?: boolean;
  availableServiceSlugs?: string[];
  bookingSummary?: ReactNode;
}

/** A small view over the same day/time links as the full booking wizard. */
export function CompactBookingCalendar({
  specialistName,
  services,
  selection,
  onChange,
  calendar,
  activeTab,
  onTabChange,
  hasSelectedTime = false,
  availableServiceSlugs,
  bookingSummary,
}: CompactBookingCalendarProps) {
  const id = useId();
  const [localTab, setLocalTab] = useState<"calendar" | "services">("calendar");
  const tab = activeTab ?? localTab;
  const setTab = (next: "calendar" | "services") => {
    setLocalTab(next);
    onTabChange?.(next);
  };
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    () => new Set(),
  );
  const activate = (next: "calendar" | "services") => {
    setTab(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };
  return (
    <section
      className="ks-booking-mini ks-booking-mini--selected"
      aria-label={`Umów wizytę — ${specialistName}`}
      data-active-tab={tab}
    >
      <div className="ks-booking-mini__content">
        <div className="ks-booking-mini__heading">
          <h3>Umów wizytę</h3>
          <div
            className="ks-booking-mini__tabs"
            role="tablist"
            aria-label="Terminarz i usługi specjalisty"
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                activate(
                  event.key === "Home"
                    ? "calendar"
                    : event.key === "End"
                      ? "services"
                      : tab === "calendar"
                        ? "services"
                        : "calendar",
                );
              }
            }}
          >
            {(
              [
                { key: "calendar", label: "Terminarz" },
                { key: "services", label: "Usługi" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`${id}-tab-${item.key}`}
                aria-controls={`${id}-panel-${item.key}`}
                aria-selected={tab === item.key}
                tabIndex={tab === item.key ? 0 : -1}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div
          role="tabpanel"
          id={`${id}-panel-calendar`}
          aria-labelledby={`${id}-tab-calendar`}
          hidden={tab !== "calendar"}
        >
          <div className="ks-booking-mini__calendar-content">{calendar}</div>
        </div>
        <div
          role="tabpanel"
          id={`${id}-panel-services`}
          aria-labelledby={`${id}-tab-services`}
          hidden={tab !== "services"}
        >
          {hasSelectedTime ? (
            <p className="ks-booking-mini__service-hint">
              Wybierz usługę dostępną w wybranym terminie. Pozostałe usługi
              możesz wybrać po zmianie terminu.
            </p>
          ) : null}
          <ul
            className="ks-booking-mini__offers"
            aria-label={`Usługi — ${specialistName}`}
          >
            {services.map((one) => (
              <li key={one.slug} className="ks-booking-mini__offer">
                <svg
                  className="ks-booking-mini__offer-separator"
                  viewBox="0 0 360 14"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                >
                  <path
                    d="M 3 8 C 46 6.4 75 9.1 112 7.3 S 181 8.6 220 7.1 S 302 7.8 356 5.6"
                    strokeWidth="1.9"
                    strokeOpacity="0.85"
                  />
                  <path
                    d="M 5 8.7 C 50 7 79 9.5 116 8 S 182 9.2 222 7.8 S 302 8.3 354 6.4"
                    strokeWidth="0.45"
                    strokeOpacity="0.28"
                  />
                </svg>
                <h4>
                  {one.description || one.modes.length ? (
                    <button
                      type="button"
                      className="ks-booking-mini__expand-service"
                      aria-expanded={expandedServices.has(one.slug)}
                      aria-controls={id + "-description-" + one.slug}
                      onClick={() =>
                        setExpandedServices((previous) => {
                          const next = new Set(previous);
                          if (next.has(one.slug)) next.delete(one.slug);
                          else next.add(one.slug);
                          return next;
                        })
                      }
                    >
                      <span>{one.name}</span>
                      <ChevronDown aria-hidden="true" />
                    </button>
                  ) : (
                    one.name
                  )}
                </h4>
                <p className="ks-booking-mini__offer-meta">
                  {one.price ? <strong>{one.price}</strong> : null}
                  <span>{one.duration ?? (one.price ? null : one.detail)}</span>
                </p>
                <button
                  className="ks-booking-mini__choose"
                  type="button"
                  disabled={
                    availableServiceSlugs
                      ? !availableServiceSlugs.includes(one.slug)
                      : false
                  }
                  aria-pressed={selection.service === one.slug}
                  onClick={() => {
                    onChange({ service: one.slug });
                    if (!hasSelectedTime) activate("calendar");
                  }}
                >
                  Wybierz<span className="sr-only">: {one.name}</span>
                </button>
                {expandedServices.has(one.slug) ? (
                  <div
                    id={id + "-description-" + one.slug}
                    className="ks-booking-mini__offer-description"
                  >
                    {one.description ? <p>{one.description}</p> : null}
                    <p className="ks-booking-mini__offer-forms">
                      <strong>Dostępne formy:</strong>{" "}
                      {one.modes
                        .map((mode) =>
                          mode === "online" ? "Online" : "Stacjonarnie",
                        )
                        .join(" / ")}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        {bookingSummary}
      </div>
    </section>
  );
}
