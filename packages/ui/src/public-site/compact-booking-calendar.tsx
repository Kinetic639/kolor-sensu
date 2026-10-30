"use client";

import { Clock3, MapPin, Video } from "lucide-react";
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
}

/** A small view over the same day/time links as the full booking wizard. */
export function CompactBookingCalendar({
  specialistName,
  services,
  locations,
  selection,
  onChange,
  calendar,
}: CompactBookingCalendarProps) {
  const id = useId();
  const [tab, setTab] = useState<"calendar" | "services">("calendar");
  const service = services.find((one) => one.slug === selection.service);
  const activate = (next: "calendar" | "services") => {
    setTab(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };
  return (
    <section
      className="ks-booking-mini ks-booking-mini--selected"
      aria-label={`Umów wizytę — ${specialistName}`}
    >
      <div className="ks-booking-mini__content">
        <div className="ks-booking-mini__heading">
          <h3>Umów wizytę</h3>
        </div>
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
        <div
          role="tabpanel"
          id={`${id}-panel-calendar`}
          aria-labelledby={`${id}-tab-calendar`}
          hidden={tab !== "calendar"}
        >
          <div className="ks-booking-mini__calendar-content">
            <div className="ks-booking-mini__service">
              <label htmlFor={`${id}-service`}>Wybierz usługę</label>
              <select
                id={`${id}-service`}
                value={selection.service}
                onChange={(event) => onChange({ service: event.target.value })}
              >
                {services.map((one) => (
                  <option key={one.slug} value={one.slug}>
                    {one.name}
                  </option>
                ))}
              </select>
              <p>
                <Clock3 aria-hidden="true" />
                {service?.detail}
              </p>
            </div>
            {service && service.modes.length > 1 ? (
              <div
                className="ks-booking-mini__modes"
                role="group"
                aria-label="Forma spotkania"
              >
                {service.modes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={selection.mode === mode}
                    onClick={() => onChange({ mode })}
                  >
                    {mode === "online" ? (
                      <Video aria-hidden="true" />
                    ) : (
                      <MapPin aria-hidden="true" />
                    )}
                    {mode === "online" ? "Online" : "W gabinecie"}
                  </button>
                ))}
              </div>
            ) : (
              <p className="ks-booking-mini__format">
                {selection.mode === "online" ? (
                  <Video aria-hidden="true" />
                ) : (
                  <MapPin aria-hidden="true" />
                )}
                {selection.mode === "online"
                  ? "Spotkanie online"
                  : "Spotkanie w gabinecie"}
              </p>
            )}
            {selection.mode === "stacjonarnie" && locations.length > 1 ? (
              <div className="ks-booking-mini__service">
                <label htmlFor={`${id}-location`}>Lokalizacja</label>
                <select
                  id={`${id}-location`}
                  value={selection.location}
                  onChange={(event) =>
                    onChange({ location: event.target.value })
                  }
                >
                  {locations.map((location) => (
                    <option key={location.slug} value={location.slug}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {calendar}
          </div>
        </div>
        <div
          role="tabpanel"
          id={`${id}-panel-services`}
          aria-labelledby={`${id}-tab-services`}
          hidden={tab !== "services"}
        >
          <ul
            className="ks-booking-mini__offers"
            aria-label={`Usługi — ${specialistName}`}
          >
            {services.map((one) => (
              <li key={one.slug} className="ks-booking-mini__offer">
                <div className="ks-booking-mini__offer-heading">
                  <h4>{one.name}</h4>
                  {one.price ? <strong>{one.price}</strong> : null}
                </div>
                <p className="ks-booking-mini__offer-meta">
                  {one.duration ?? one.detail} ·{" "}
                  {one.modes
                    .map((mode) =>
                      mode === "online" ? "Online" : "W gabinecie",
                    )
                    .join(" / ")}
                </p>
                {one.description ? (
                  <p className="ks-booking-mini__offer-description">
                    {one.description}
                  </p>
                ) : null}
                <button
                  className="ks-booking-mini__choose"
                  type="button"
                  onClick={() => {
                    onChange({ service: one.slug });
                    activate("calendar");
                  }}
                >
                  Sprawdź terminy<span className="sr-only">: {one.name}</span> →
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
