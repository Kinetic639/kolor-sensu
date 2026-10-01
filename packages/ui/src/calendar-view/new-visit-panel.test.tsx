import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { AddVisitBanner, AddVisitButton } from "./add-visit";
import { NewVisitPanel, type NewVisitPanelProps } from "./new-visit-panel";
import { SlotPickLayer } from "./slot-picker";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

const ANNA = "11111111-1111-4111-8111-111111111111";
const JAN = "22222222-2222-4222-8222-222222222222";
const ROOM = "33333333-3333-4333-8333-333333333333";
const OFFER = "44444444-4444-4444-8444-444444444444";
const ONLINE_OFFER = "55555555-5555-4555-8555-555555555555";

const props: NewVisitPanelProps = {
  specialists: [
    { id: ANNA, name: "Anna Nowak" },
    { id: JAN, name: "Jan Lis" },
  ],
  offers: [
    {
      id: OFFER,
      specialistId: ANNA,
      serviceName: "Konsultacja",
      priceMinor: 22000,
      currencyCode: "PLN",
      durationMinutes: 50,
      modes: ["in_person", "online"],
    },
    {
      id: ONLINE_OFFER,
      specialistId: JAN,
      serviceName: "Konsultacja online",
      priceMinor: 18000,
      currencyCode: "PLN",
      durationMinutes: 30,
      modes: ["online"],
    },
  ],
  rooms: [{ id: ROOM, name: "Gabinet 1", locationName: "Mokotowska" }],
  defaults: {
    specialistId: ANNA,
    date: "2030-10-02",
    time: "12:15",
    mode: "in_person",
    roomId: ROOM,
  },
  action: vi.fn(),
  closeHref: "/kalendarz",
};

function renderPanel(
  overrides: Partial<NewVisitPanelProps> = {},
  onUrlUpdate?: OnUrlUpdateFunction,
) {
  return render(
    <NuqsTestingAdapter
      onUrlUpdate={onUrlUpdate}
      searchParams="?nowa=true&termin=2030-10-02T12:15"
    >
      <NewVisitPanel {...props} {...overrides} />
    </NuqsTestingAdapter>,
  );
}

describe("NewVisitPanel", () => {
  it("starts from the picked place: who, what, where, when", () => {
    renderPanel();
    expect(
      screen.getByRole("complementary", { name: "Nowa wizyta" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Specjalista")).toHaveValue(ANNA);
    expect(screen.getByLabelText("Usługa")).toHaveValue(OFFER);
    expect(screen.getByText(/^50 min · 220\s?zł$/)).toBeInTheDocument();
    // Nothing is paid on site: the client pays online from the e-mail.
    expect(screen.queryByText(/na miejscu/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Klient dostanie e-mail z linkiem do płatności online/),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Stacjonarnie" })).toBeChecked();
    expect(screen.getByLabelText("Gabinet")).toHaveValue(ROOM);
    expect(screen.getByLabelText("Dzień")).toHaveValue("2030-10-02");
    expect(screen.getByLabelText("Godzina")).toHaveValue("12:15");
  });

  it("another specialist: their services and forms", async () => {
    renderPanel();
    await userEvent.selectOptions(screen.getByLabelText("Specjalista"), JAN);
    expect(screen.getByLabelText("Usługa")).toHaveValue(ONLINE_OFFER);
    expect(screen.getByRole("radio", { name: "Online" })).toBeChecked();
    expect(screen.queryByLabelText("Gabinet")).not.toBeInTheDocument();
  });

  it("asks for the client's e-mail (the link to pay goes there) before sending anything", async () => {
    const action = vi.fn();
    renderPanel({ action });
    await userEvent.type(
      screen.getByLabelText("Imię i nazwisko"),
      "Ewa Klientka",
    );
    await userEvent.type(screen.getByLabelText("Telefon"), "600 100 200");
    await userEvent.click(
      screen.getByRole("button", { name: "Zarezerwuj wizytę" }),
    );
    expect(
      await screen.findByText(
        "Podaj e-mail klienta: wyślemy na niego link do płatności.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(action).not.toHaveBeenCalled();
  });

  it("reserves it, then opens the visit", async () => {
    const action = vi.fn().mockResolvedValue({
      ok: true,
      id: "66666666-6666-4666-8666-666666666666",
      reference: "3010-001",
      paymentDueAt: "2030-09-30T10:15:00.000Z",
      emailed: "sent",
    });
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderPanel({ action }, onUrlUpdate);
    await userEvent.type(
      screen.getByLabelText("Imię i nazwisko"),
      "Jan Telefon",
    );
    await userEvent.type(screen.getByLabelText("E-mail"), "jan@example.com");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Zarezerwuj wizytę" }),
    );

    expect(action).toHaveBeenCalledWith({
      offerId: OFFER,
      mode: "in_person",
      date: "2030-10-02",
      time: "12:15",
      roomId: ROOM,
      name: "Jan Telefon",
      email: "jan@example.com",
      phone: "",
      notes: "",
    });
    await vi.waitFor(() =>
      expect(onUrlUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryString: "?wizyta=66666666-6666-4666-8666-666666666666",
        }),
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
    await userEvent.type(
      screen.getByLabelText("Imię i nazwisko"),
      "Ewa Klientka",
    );
    await userEvent.type(screen.getByLabelText("E-mail"), "ewa@example.com");
    await userEvent.click(
      screen.getByRole("button", { name: "Zarezerwuj wizytę" }),
    );
    expect(
      await screen.findByText("Wybierz inną godzinę."),
    ).toBeInTheDocument();
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ewa@example.com" }),
    );
  });

  it("a specialist books only themselves: no choice of person", () => {
    renderPanel({ specialists: [{ id: ANNA, name: "Anna Nowak" }] });
    expect(screen.queryByLabelText("Specjalista")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Usługa")).toHaveValue(OFFER);
  });
});

describe("adding mode", () => {
  it("the button turns it on and off", () => {
    const { rerender } = render(
      <AddVisitButton active={false} href="/kalendarz?nowa=true" />,
    );
    expect(screen.getByRole("button", { name: "Nowa wizyta" })).toHaveAttribute(
      "href",
      "/kalendarz?nowa=true",
    );
    rerender(<AddVisitButton active href="/kalendarz" />);
    expect(
      screen.getByRole("button", { name: "Anuluj wybór" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("the banner offers the form by hand and a way out", () => {
    render(
      <AddVisitBanner
        cancelHref="/kalendarz"
        manualHref="/kalendarz?nowa=true&termin=2030-10-02T09:00"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Otwórz formularz ręcznie" }),
    ).toHaveAttribute("href", "/kalendarz?nowa=true&termin=2030-10-02T09:00");
    expect(screen.getByRole("link", { name: "Anuluj" })).toHaveAttribute(
      "href",
      "/kalendarz",
    );
  });

  it("a click in a column picks the quarter hour there", async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    const { container } = render(
      <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} searchParams="?nowa=true">
        <div style={{ position: "relative", height: 680 }}>
          <SlotPickLayer
            column={ANNA}
            date="2030-10-02"
            range={{ start: 8 * 60, end: 18 * 60 }}
          />
        </div>
      </NuqsTestingAdapter>,
    );
    const layer = container.querySelector("[data-slot-picker]")!;
    layer.getBoundingClientRect = () =>
      ({ top: 0, left: 0, height: 680, width: 100 }) as DOMRect;
    // 3.5 hours down (238px at 68px an hour) from 8:00 is 11:30.
    await userEvent.pointer({
      keys: "[MouseLeft]",
      target: layer,
      coords: { clientX: 10, clientY: 238 },
    });
    expect(onUrlUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryString: `?nowa=true&termin=2030-10-02T11:30&kolumna=${ANNA}`,
      }),
    );
  });
});
