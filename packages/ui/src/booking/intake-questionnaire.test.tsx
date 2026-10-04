import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IntakeQuestionnaire } from "./intake-questionnaire";

function setup() {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<IntakeQuestionnaire onSubmit={onSubmit} />);
  return onSubmit;
}

const next = () =>
  userEvent.click(screen.getByRole("button", { name: "Dalej" }));
const pickMood = (value: number) =>
  userEvent.click(screen.getByRole("radio", { name: String(value) }));
const check = (name: string) =>
  userEvent.click(screen.getByRole("checkbox", { name }));

describe("IntakeQuestionnaire", () => {
  it("starts by saying why, with the crisis line always at hand", async () => {
    setup();
    expect(
      screen.getByRole("heading", { name: /Zanim umówisz konsultację/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /800 702 222/ })).toHaveAttribute(
      "href",
      "tel:800702222",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Rozpocznij test" }),
    );
    expect(
      screen.getByRole("radiogroup", {
        name: "Jak oceniasz swoje samopoczucie?",
      }),
    ).toBeInTheDocument();
  });

  it("at 0: no booking, the crisis lines instead", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Rozpocznij test" }),
    );
    await pickMood(0);
    expect(screen.queryByRole("button", { name: "Dalej" })).toBeNull();
    const help = screen.getByRole("region", {
      name: "Nie musisz zmagać się z tym samodzielnie",
    });
    for (const number of ["800 702 222", "116 123", "116 111", "112"]) {
      expect(within(help).getByText(number)).toBeInTheDocument();
    }
    // Chosen by mistake: another answer takes it back.
    await pickMood(5);
    expect(screen.getByRole("button", { name: "Dalej" })).toBeEnabled();
  });

  it("at 1 or 2: the lines shown, the test goes on", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Rozpocznij test" }),
    );
    await pickMood(2);
    expect(
      screen.getByRole("region", { name: "Jeśli potrzebujesz pomocy teraz" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dalej" })).toBeEnabled();
  });

  it("through every question to the consent; the answers sent", async () => {
    const onSubmit = setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Rozpocznij test" }),
    );
    await pickMood(6);
    await next();
    // A question needs an answer to go on.
    await next();
    expect(
      screen.getByText("Wybierz co najmniej jedną odpowiedź."),
    ).toBeInTheDocument();
    await check("Lęk");
    await check("Stres");
    await next();
    await check("Zawodowe (np. stres w pracy, brak motywacji)");
    await next();
    await check("Grupy wsparcia");
    await next();
    await userEvent.click(
      screen.getByRole("radio", {
        name: "Nie mam diagnozy, ale podejrzewam u siebie neuroatypowość",
      }),
    );
    await next();
    // Suspected: the needs are asked.
    await check("Radzenie sobie z nadwrażliwością sensoryczną");
    await next();
    const send = screen.getByRole("button", {
      name: "Zapisz i wybierz termin",
    });
    await userEvent.click(send);
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("checkbox", { name: /zgodę na przetwarzanie/ }),
    );
    await userEvent.click(send);
    expect(onSubmit).toHaveBeenCalledWith({
      mood: 6,
      difficulties: ["anxiety", "stress"],
      lifeAreas: ["work"],
      support: ["support-groups"],
      neurodiversity: "suspected",
      neurodiversityNeeds: ["sensory"],
      healthConsent: true,
    });
    // A long walk (every step): more time when the suite runs in parallel.
  }, 20_000);

  it("no diagnosis: the needs are not asked", async () => {
    const onSubmit = setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Rozpocznij test" }),
    );
    await pickMood(7);
    await next();
    await check("Depresja");
    await next();
    await check("Rodzinne (np. trudności w relacjach rodzinnych)");
    await next();
    await check("Nie wiem");
    await next();
    await userEvent.click(
      screen.getByRole("radio", {
        name: "Nie mam diagnozy i nie podejrzewam neuroatypowości",
      }),
    );
    await next();
    await userEvent.click(
      screen.getByRole("checkbox", { name: /zgodę na przetwarzanie/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Zapisz i wybierz termin" }),
    );
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      neurodiversity: "none",
      neurodiversityNeeds: [],
    });
  });

  it("back keeps the answers", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Rozpocznij test" }),
    );
    await pickMood(4);
    await next();
    await userEvent.click(screen.getByRole("button", { name: "Wstecz" }));
    expect(screen.getByRole("radio", { name: "4" })).toBeChecked();
  });
});
