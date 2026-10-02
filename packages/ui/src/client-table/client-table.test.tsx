import type { ClientRow } from "@repo/scheduling";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientCard } from "./client-card";
import { ClientTable } from "./client-table";
import { EditClientButton } from "./edit-client";
import { loadClientTableParams } from "./params";

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const row: ClientRow = {
  id: "client-1",
  name: "Jan Kowalski",
  email: "jan@example.invalid",
  phone: "600 100 200",
  visits: "3",
  upcoming: "1 nadchodząca",
  lastVisit: "20.09.2026",
  nextVisit: "pon. 05.10.2026, 10:00",
  paid: "600 zł",
  since: "Klient od 01.09.2026",
  href: "/klienci/client-1",
};

beforeEach(() => {
  router.refresh.mockReset();
  vi.mocked(toast.success).mockReset();
});

describe("ClientTable", () => {
  it("each client with their visits, the name opening their card", () => {
    render(
      <ClientTable
        params={loadClientTableParams({})}
        path="/klienci"
        rows={[row]}
        total={1}
      />,
      { wrapper: withNuqsTestingAdapter() },
    );
    const table = screen.getByRole("table", { name: "Klienci" });
    expect(
      within(table).getByRole("link", { name: "Jan Kowalski" }),
    ).toHaveAttribute("href", "/klienci/client-1");
    expect(table).toHaveTextContent("1 nadchodząca");
    expect(table).toHaveTextContent("600 zł");
    // Sorted by the latest visit, latest first, by default.
    expect(
      within(table).getByRole("columnheader", { name: /Ostatnia wizyta/ }),
    ).toHaveAttribute("aria-sort", "descending");
    expect(within(table).getByRole("link", { name: /Klient/ })).toHaveAttribute(
      "href",
      "/klienci?sort=nazwisko",
    );
    expect(screen.getByLabelText("Szukaj klientów")).toBeInTheDocument();
    expect(screen.getByText("1–1 z 1")).toBeInTheDocument();
  });

  it("says why it is empty", () => {
    const { rerender } = render(
      <ClientTable
        params={loadClientTableParams({})}
        path="/klienci"
        rows={[]}
        total={0}
      />,
      { wrapper: withNuqsTestingAdapter() },
    );
    expect(screen.getByText(/Nie ma jeszcze klientów/)).toBeInTheDocument();
    rerender(
      <ClientTable
        params={loadClientTableParams({ q: "xyz" })}
        path="/klienci"
        rows={[]}
        total={0}
      />,
    );
    expect(
      screen.getByText("Nikt nie pasuje do wyszukiwania."),
    ).toBeInTheDocument();
  });
});

describe("ClientCard", () => {
  it("how to reach them, their numbers and the centre's note", () => {
    render(<ClientCard cancelled={1} notes="Woli popołudnia" row={row} />);
    expect(
      screen.getByRole("heading", { name: "Jan Kowalski" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "jan@example.invalid" }),
    ).toHaveAttribute("href", "mailto:jan@example.invalid");
    expect(screen.getByRole("link", { name: "600 100 200" })).toHaveAttribute(
      "href",
      "tel:600100200",
    );
    expect(screen.getByText("Woli popołudnia")).toBeInTheDocument();
  });

  it("no note yet", () => {
    render(
      <ClientCard cancelled={0} notes={null} row={{ ...row, phone: null }} />,
    );
    expect(screen.getByText(/Brak notatki/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /600/ })).not.toBeInTheDocument();
  });
});

describe("EditClientButton", () => {
  const details = {
    name: "Jan Kowalski",
    email: "jan@example.invalid",
    phone: "600 100 200",
    notes: null,
  };

  it("checks the fields before asking", async () => {
    const action = vi.fn();
    render(
      <EditClientButton
        action={action}
        clientId="client-1"
        details={details}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edytuj dane" }));
    const email = screen.getByLabelText("E-mail");
    await userEvent.clear(email);
    await userEvent.type(email, "nie e-mail");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    expect(
      await screen.findByText("Podaj poprawny adres e-mail."),
    ).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(action).not.toHaveBeenCalled();
  });

  it("saves, says the visits to come followed, and refreshes", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, upcomingUpdated: 2 });
    render(
      <EditClientButton
        action={action}
        clientId="client-1"
        details={details}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edytuj dane" }));
    await userEvent.type(
      screen.getByLabelText(/Notatka centrum/),
      "Woli popołudnia",
    );
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    await vi.waitFor(() =>
      expect(action).toHaveBeenCalledWith("client-1", {
        name: "Jan Kowalski",
        email: "jan@example.invalid",
        phone: "600 100 200",
        notes: "Woli popołudnia",
      }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Zapisano dane klienta. Zmieniono też 2 nadchodzące wizyty.",
    );
    expect(router.refresh).toHaveBeenCalled();
  });

  it("says why the database refused", async () => {
    const action = vi.fn().mockResolvedValue({
      ok: false,
      message: "Inny klient ma już ten adres e-mail.",
    });
    render(
      <EditClientButton
        action={action}
        clientId="client-1"
        details={details}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edytuj dane" }));
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    expect(
      await screen.findByText("Inny klient ma już ten adres e-mail."),
    ).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
