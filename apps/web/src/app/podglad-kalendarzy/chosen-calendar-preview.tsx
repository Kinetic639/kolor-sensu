"use client";

import { AvailabilityCalendarClient } from "@/features/booking/availability-calendar.client";
import styles from "./preview.module.css";

export function ChosenCalendarPreview({
  query,
  name,
  service,
  detail,
  today,
  lastDay,
}: {
  query: string;
  name: string;
  service: string;
  detail: string;
  today: string;
  lastDay: string;
}) {
  return (
    <div
      className={`${styles.card} ${styles.variant10}`}
      aria-label="Wariant 11: kalendarz wybrany do sekcji zespołu"
    >
      <div className={styles.cardIntro}>
        <span className={styles.avatar}>
          {name
            .split(" ")
            .map((word) => word[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div>
          <p>{name}</p>
          <h3>{service}</h3>
          <span>{detail}</span>
        </div>
      </div>
      <AvailabilityCalendarClient
        query={query}
        today={today}
        lastDay={lastDay}
      />
    </div>
  );
}
