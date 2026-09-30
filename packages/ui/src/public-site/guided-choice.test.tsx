import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { matchSupport } from "./guided-choice-match";
import { GuidedChoiceSection } from "./guided-choice-section";
import { sampleGuidedChoice } from "./living-samples";

const { specialists } = sampleGuidedChoice;

describe("matchSupport", () => {
  it("suggests couples therapy and the team's couple specialists", () => {
    const suggestion = matchSupport(
      { audience: "couple", concern: "relations", format: "any" },
      specialists,
    );
    expect(suggestion.service).toBe("Psychoterapia par");
    expect(suggestion.specialists.map((s) => s.name)).toEqual([
      "Anna Nowak",
      "Katarzyna Zielińska",
    ]);
  });

  it("starts with a crisis consultation after a hard event", () => {
    expect(
      matchSupport(
        { audience: "self", concern: "crisis", format: "office" },
        specialists,
      ).service,
    ).toBe("Konsultacja kryzysowa");
  });

  it("only suggests specialists who meet online when asked for online", () => {
    const suggestion = matchSupport(
      { audience: "child", concern: "mood", format: "online" },
      specialists,
    );
    expect(suggestion.specialists.every((s) => s.online)).toBe(true);
    expect(suggestion.specialists.map((s) => s.name)).toEqual([
      "Tomasz Wójcik",
    ]);
  });

  it("puts specialists who work with the concern first", () => {
    const suggestion = matchSupport(
      { audience: "self", concern: "growth", format: "any" },
      specialists,
    );
    expect(suggestion.specialists[0]!.name).toBe("Tomasz Wójcik");
  });
});

describe("GuidedChoiceSection", () => {
  it("asks only the first question in the server HTML", () => {
    const html = renderToString(
      <GuidedChoiceSection {...sampleGuidedChoice} />,
    );
    expect(html).toContain("Dla kogo szukasz pomocy?");
    expect(html).not.toContain("Czego to dotyczy?");
  });

  it("asks the next question once the previous one is answered, then suggests", async () => {
    const user = userEvent.setup();
    render(<GuidedChoiceSection {...sampleGuidedChoice} />);
    expect(
      screen.queryByRole("group", { name: /Czego to dotyczy/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Dla nas, jako pary" }));
    await user.click(
      screen.getByRole("radio", { name: "Relacje i komunikacja" }),
    );
    expect(
      screen.queryByText("Proponujemy na początek"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Online" }));

    expect(screen.getByText("Proponujemy na początek")).toBeInTheDocument();
    expect(screen.getByText("Psychoterapia par")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Anna Nowak/ })).toHaveAttribute(
      "href",
      "#anna-nowak",
    );

    await user.click(screen.getByRole("button", { name: "Zacznij od nowa" }));
    expect(
      screen.queryByText("Proponujemy na początek"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Dla siebie" })).not.toBeChecked();
  });

  it("changes the picture with the first answer", async () => {
    const user = userEvent.setup();
    render(<GuidedChoiceSection {...sampleGuidedChoice} />);
    const [self, , child] = sampleGuidedChoice.audiences;
    expect(
      screen.getByRole("img", { name: self!.image.alt }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("radio", { name: "Dla dziecka lub nastolatka" }),
    );
    expect(
      screen.getByRole("img", { name: child!.image.alt }),
    ).toBeInTheDocument();
  });
});
