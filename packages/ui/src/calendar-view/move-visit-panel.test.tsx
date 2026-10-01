import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { AddVisitBanner } from "./add-visit";
import { MoveVisitPanel, type MoveVisitPanelProps } from "./move-visit-panel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const VISIT = "66666666-6666-4666-8666-666666666666";
const ROOM = "33333333-3333-4333-8333-333333333333";

const props: MoveVisitPanelProps = {
  visit: {
    id: VISIT,
    reference: "3010-017",
    clientName: "Jan Kowalski",
    serviceName: "Konsultacja",
    specialistName: "Anna Nowak",
    current: "środa, 2 października 2030, 11:00–11:50 · Online",
  },
  defaults: { date: "2030-10-02", time: "15:00", mode: "online", roomId: null },
  rooms: [{ id: ROOM, name: "Gabinet 1", locationName: "Mokotowska" }],
  action: vi.fn(),
  closeHref: "/kalendarz",
};

function renderPanel(
  overrides: Partial<MoveVisitPanelProps> = {},
  onUrlUpdate?: OnUrlUpdateFunction,
) {
  return render(
    <NuqsTestingAdapter
      onUrlUpdate={onUrlUpdate}
      searchParams={`?przesun=${VISIT}&nowa=true&termin=2030-10-02T15:00`}
    >
      <MoveVisitPanel {...props} {...overrides} />
    </NuqsTestingAdapter>,
  );
}

describe("MoveVisitPanel", () => {
  it("starts from the picked place, with the visit as it is now", () => {
    renderPanel();
    const panel = screen.getByRole("complementary", { name: "Przesuń wizytę" });
    expect(panel).toHaveTextContent("3010-017 · Jan Kowalski");
    expect(panel).toHaveTextContent("środa, 2 października 2030, 11:00–11:50");
    expect(screen.getByLabelText("Dzień")).toHaveValue("2030-10-02");
    expect(screen.getByLabelText("Godzina")).toHaveValue("15:00");
    expect(screen.getByRole("radio", { name: "Online" })).toBeChecked();
    expect(screen.queryByLabelText("Gabinet")).not.toBeInTheDocument();
  });

  it("in person needs a room (the only one, chosen for you)", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    renderPanel({ action });
    await userEvent.click(screen.getByRole("radio", { name: "Stacjonarnie" }));
    expect(screen.getByLabelText("Gabinet")).toHaveValue(ROOM);
  });

  it("moves it with why, then opens the visit", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderPanel({ action }, onUrlUpdate);
    await userEvent.type(
      screen.getByLabelText("Powód (zobaczy go klient, opcjonalnie)"),
      "Prośba klienta",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Przesuń wizytę" }),
    );
    expect(action).toHaveBeenCalledWith(VISIT, {
      date: "2030-10-02",
      time: "15:00",
      mode: "online",
      roomId: null,
      reason: "Prośba klienta",
    });
    await vi.waitFor(() =>
      expect(onUrlUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({ queryString: `?wizyta=${VISIT}` }),
      ),
    );
  });

  it("shows why the server refused", async () => {
    const action = vi.fn().mockResolvedValue({
      ok: false,
      message: "Gabinet jest wtedy zajęty.",
      fields: { time: "Wybierz inną godzinę." },
    });
    renderPanel({ action });
    await userEvent.click(
      screen.getByRole("button", { name: "Przesuń wizytę" }),
    );
    expect(
      await screen.findByText("Wybierz inną godzinę."),
    ).toBeInTheDocument();
  });
});

describe("AddVisitBanner, moving", () => {
  it("says which visit is being moved", () => {
    render(
      <AddVisitBanner
        cancelHref="/kalendarz"
        manualHref="/kalendarz?przesun=x&termin=2030-10-02T09:00"
        moving={{ reference: "3010-017", label: "Jan Kowalski, środa 11:00" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Przesuwanie wizyty 3010-017",
    );
  });
});
