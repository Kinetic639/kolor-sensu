import type { WorkshopParticipant } from "@repo/supabase/workshops-admin";
import { describe, expect, it } from "vitest";
import {
  participantGroups,
  participantsCsv,
  paymentLabel,
  refundable,
} from "./participants-view";

function participant(
  patch: Partial<WorkshopParticipant> = {},
): WorkshopParticipant {
  return {
    id: "r1",
    reference: "W2611-001",
    status: "confirmed",
    bookedBy: "client",
    name: "Ola Nowak",
    email: "ola@example.invalid",
    phone: "500600700",
    notes: null,
    priceMinor: 15000,
    paidMinor: 15000,
    refundDueMinor: 0,
    refundedMinor: 0,
    paidOutside: false,
    paymentDueAt: null,
    offerExpiresAt: null,
    holdExpiresAt: null,
    waitlistedAt: null,
    attended: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: "2030-10-01T10:00:00Z",
    ...patch,
  };
}

const money = (minor: number) => `${minor / 100} zł`;

describe("a workshop's participants", () => {
  it("are grouped: in, waiting (in order) and gone", () => {
    const groups = participantGroups([
      participant({ id: "a" }),
      participant({
        id: "w2",
        status: "waitlisted",
        waitlistedAt: "2030-10-03T10:00:00Z",
      }),
      participant({
        id: "w1",
        status: "waitlisted",
        waitlistedAt: "2030-10-02T10:00:00Z",
      }),
      participant({ id: "x", status: "cancelled" }),
    ]);
    expect(groups.zapisani.map((one) => one.id)).toEqual(["a"]);
    expect(groups.lista.map((one) => one.id)).toEqual(["w1", "w2"]);
    expect(groups.anulowani.map((one) => one.id)).toEqual(["x"]);
  });

  it("say how they paid and what can be given back", () => {
    expect(paymentLabel(participant(), money)).toBe("150 zł");
    expect(
      paymentLabel(participant({ paidOutside: true, paidMinor: 0 }), money),
    ).toBe("Poza stroną");
    expect(paymentLabel(participant({ refundedMinor: 15000 }), money)).toBe(
      "150 zł, zwrot 150 zł",
    );
    expect(refundable(participant({ refundedMinor: 5000 }))).toBe(10000);
    expect(refundable(participant({ paidOutside: true }))).toBe(0);
  });

  it("go to a spreadsheet, quoted where needed", () => {
    const csv = participantsCsv([
      participant({ notes: 'Wegetarianka; "bez glutenu"', attended: true }),
    ]);
    const [header, row] = csv.split("\r\n");
    expect(header).toBe(
      "Numer;Imię i nazwisko;E-mail;Telefon;Stan;Wpłata (zł);Obecność;Uwagi",
    );
    expect(row).toBe(
      'W2611-001;Ola Nowak;ola@example.invalid;500600700;Potwierdzony;150,00;tak;"Wegetarianka; ""bez glutenu"""',
    );
  });
});
