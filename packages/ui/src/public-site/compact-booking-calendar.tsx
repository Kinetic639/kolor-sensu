"use client";

import { Clock3, MapPin, Video } from "lucide-react";
import { useId, type ReactNode } from "react";

export type CompactBookingMode = "stacjonarnie" | "online";
export interface CompactBookingService {
  slug: string;
  name: string;
  detail: string;
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
  const service = services.find((one) => one.slug === selection.service);
  return (
    <section
      className="ks-booking-mini ks-booking-mini--selected"
      aria-label={`Umów wizytę — ${specialistName}`}
    >
      <div className="ks-booking-mini__content">
        <div className="ks-booking-mini__heading">
          <h3>Umów wizytę</h3>
        </div>
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
              onChange={(event) => onChange({ location: event.target.value })}
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
    </section>
  );
}
