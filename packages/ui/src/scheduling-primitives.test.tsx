import type {
  ScheduleAvailability,
  SpecialistScheduleResource,
} from "@repo/scheduling";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvailabilityBlock } from "./availability-block";
import { ResourceHeader } from "./resource-header";
import {
  getAvailabilityVisualVariant,
  getRoomColorTokenFamily,
} from "./scheduling-colors";

const specialist: SpecialistScheduleResource = {
  type: "specialist",
  id: "anna-nowak",
  name: "Anna Nowak",
  avatar: { initials: "AN" },
  professionalTitle: "Psychoterapeutka CBT",
  availabilitySummary: "08:00–16:00",
  bookedMinutes: 300,
  availableMinutes: 480,
  appointmentCount: 5,
};

describe("scheduling visual variants", () => {
  it("maps room semantic colors to centralized token families", () => {
    expect(getRoomColorTokenFamily("sage")).toEqual({
      surface: "--schedule-sage-surface",
      surfaceMuted: "--schedule-sage-surface-muted",
      border: "--schedule-sage-border",
      accent: "--schedule-sage-accent",
      foreground: "--schedule-sage-foreground",
    });
  });

  it("selects room, online, hybrid and unavailable visual variants", () => {
    const room: ScheduleAvailability = {
      id: "room",
      kind: "room",
      roomId: "gabinet-1",
      roomName: "Gabinet 1",
      roomColor: "peach",
      start: "2025-04-14T06:00:00.000Z",
      end: "2025-04-14T14:00:00.000Z",
    };
    const online: ScheduleAvailability = {
      id: "online",
      kind: "online",
      start: "2025-04-14T14:00:00.000Z",
      end: "2025-04-14T16:00:00.000Z",
    };
    const hybrid: ScheduleAvailability = {
      id: "hybrid",
      kind: "hybrid",
      start: "2025-04-14T10:00:00.000Z",
      end: "2025-04-14T12:00:00.000Z",
    };

    expect(getAvailabilityVisualVariant(room)).toBe("peach");
    expect(getAvailabilityVisualVariant(online)).toBe("online");
    expect(getAvailabilityVisualVariant(hybrid)).toBe("hybrid");
    expect(getAvailabilityVisualVariant(null)).toBe("unavailable");
  });
});

describe("scheduling primitives", () => {
  it("renders specialist occupancy and appointment context", () => {
    render(<ResourceHeader resource={specialist} />);

    expect(screen.getByRole("group", { name: "Anna Nowak" })).toHaveAttribute(
      "data-state",
      "available",
    );
    expect(screen.getByText("Psychoterapeutka CBT")).toBeVisible();
    expect(screen.getByText("5/8 spotkań")).toBeVisible();
    expect(screen.getByText("63%")).toBeVisible();
  });

  it("keeps unavailable resources and availability visible in a muted state", () => {
    render(
      <>
        <ResourceHeader
          resource={{
            ...specialist,
            id: "karolina-adamczyk",
            name: "Karolina Adamczyk",
            availabilitySummary: undefined,
            bookedMinutes: 0,
            availableMinutes: 0,
            appointmentCount: 0,
          }}
        />
        <AvailabilityBlock availability={null} />
      </>,
    );

    expect(
      screen.getByRole("group", { name: "Karolina Adamczyk" }),
    ).toHaveAttribute("data-state", "unavailable");
    expect(screen.getAllByText("Brak dostępności")).toHaveLength(2);
    expect(
      screen.getByRole("note", { name: "Brak dostępności" }),
    ).toHaveAttribute("data-state", "unavailable");
  });

  it("resolves default and compact availability variants", () => {
    const availability: ScheduleAvailability = {
      id: "online",
      kind: "online",
      start: "2025-04-14T14:00:00.000Z",
      end: "2025-04-14T16:00:00.000Z",
    };
    const { rerender } = render(
      <AvailabilityBlock availability={availability} />,
    );

    expect(screen.getByRole("group", { name: "Online" })).toHaveAttribute(
      "data-variant",
      "default",
    );
    expect(screen.getByText("Konsultacje online")).toBeVisible();

    rerender(
      <AvailabilityBlock availability={availability} variant="compact" />,
    );

    expect(screen.getByRole("group", { name: "Online" })).toHaveAttribute(
      "data-variant",
      "compact",
    );
    expect(screen.queryByText("Konsultacje online")).not.toBeInTheDocument();
  });
});
