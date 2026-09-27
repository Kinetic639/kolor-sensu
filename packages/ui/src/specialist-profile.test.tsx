import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ProfilePhotoField,
  ProfileStatusBanner,
  SpecialistProfilePreview,
  TagListField,
} from "./specialist-profile";

function TagListWithState({ initial = [] }: { initial?: string[] }) {
  const [values, setValues] = useState(initial);
  return (
    <TagListField
      id="languages"
      label="Języki"
      values={values}
      onChange={setValues}
    />
  );
}

describe("TagListField", () => {
  it("adds a trimmed tag with Enter and with the add button", async () => {
    const user = userEvent.setup();
    render(<TagListWithState />);

    const input = screen.getByRole("textbox", { name: "Języki" });
    await user.type(input, "  Polski {Enter}");
    await user.type(input, "Angielski");
    await user.click(screen.getByRole("button", { name: "Dodaj: Języki" }));

    const list = screen.getByRole("list", { name: "Języki" });
    expect(list).toHaveTextContent("Polski");
    expect(list).toHaveTextContent("Angielski");
    expect(input).toHaveValue("");
  });

  it("ignores empty values and case-insensitive duplicates", async () => {
    const user = userEvent.setup();
    render(<TagListWithState initial={["Polski"]} />);

    const input = screen.getByRole("textbox", { name: "Języki" });
    await user.type(input, "   {Enter}");
    await user.type(input, "polski{Enter}");

    expect(
      screen.getByRole("list", { name: "Języki" }).querySelectorAll("li"),
    ).toHaveLength(1);
  });

  it("removes a tag with its own button", async () => {
    const user = userEvent.setup();
    render(<TagListWithState initial={["Polski", "Angielski"]} />);

    await user.click(screen.getByRole("button", { name: "Usuń: Polski" }));

    const list = screen.getByRole("list", { name: "Języki" });
    expect(list).not.toHaveTextContent("Polski");
    expect(list).toHaveTextContent("Angielski");
  });

  it("does not add more tags than the limit", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagListField
        id="langs"
        label="Języki"
        maxItems={1}
        values={["Polski"]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Języki" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Dodaj: Języki" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a validation message", () => {
    render(
      <TagListField
        id="specs"
        label="Specjalizacje"
        values={[]}
        error="Dodaj co najmniej jedną specjalizację."
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dodaj co najmniej jedną specjalizację.",
    );
    expect(
      screen.getByRole("textbox", { name: "Specjalizacje" }),
    ).toHaveAttribute("aria-invalid", "true");
  });
});

describe("ProfilePhotoField", () => {
  it("passes the chosen file to onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ProfilePhotoField
        id="avatar"
        label="Avatar"
        hint="JPG, PNG lub WebP do 5 MB. Format 1:1."
        imageUrl={null}
        onSelect={onSelect}
        onRemove={() => {}}
      />,
    );

    const file = new File(["x"], "anna.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Avatar: wybierz plik"), file);

    expect(onSelect).toHaveBeenCalledWith(file);
    expect(
      screen.getByRole("button", { name: "Dodaj zdjęcie: Avatar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Usuń: Avatar" }),
    ).not.toBeInTheDocument();
  });

  it("shows the photo with change and remove actions", () => {
    const onRemove = vi.fn();
    render(
      <ProfilePhotoField
        id="avatar"
        label="Avatar"
        alt="Anna Kowalska"
        imageUrl="/anna.jpg"
        onSelect={() => {}}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByRole("img", { name: "Anna Kowalska" })).toHaveAttribute(
      "src",
      "/anna.jpg",
    );
    expect(
      screen.getByRole("button", { name: "Zmień zdjęcie: Avatar" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usuń: Avatar" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("disables actions while uploading and shows errors", () => {
    render(
      <ProfilePhotoField
        id="portrait"
        label="Portret"
        imageUrl="/p.jpg"
        pending
        error="Plik jest za duży."
        onSelect={() => {}}
        onRemove={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Zmień zdjęcie: Portret" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Usuń: Portret" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Plik jest za duży.");
  });

  it("offers to adjust the crop of an existing photo", () => {
    const onAdjust = vi.fn();
    render(
      <ProfilePhotoField
        id="avatar"
        label="Avatar"
        imageUrl="/anna.jpg"
        onAdjust={onAdjust}
        onSelect={() => {}}
        onRemove={() => {}}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Dopasuj kadr: Avatar" }),
    );
    expect(onAdjust).toHaveBeenCalled();
  });
});

describe("ProfileStatusBanner", () => {
  it("explains a pending review", () => {
    render(<ProfileStatusBanner status="pending_review" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Zmiany oczekują na akceptację",
    );
  });

  it("shows the reviewer's comment after a rejection", () => {
    render(
      <ProfileStatusBanner
        status="rejected"
        reviewComment="Dodaj zdjęcie portretowe."
      />,
    );
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Zmiany zostały odrzucone");
    expect(banner).toHaveTextContent("Dodaj zdjęcie portretowe.");
  });

  it("explains an unsent draft and a published profile", () => {
    const { rerender } = render(<ProfileStatusBanner status="draft" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Masz niewysłane zmiany",
    );
    rerender(<ProfileStatusBanner status="published" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Profil jest opublikowany",
    );
  });
});

describe("SpecialistProfilePreview", () => {
  it("renders the public card with filled sections only", () => {
    render(
      <SpecialistProfilePreview
        displayName="Anna Kowalska"
        professionalTitle="Psychoterapeutka"
        photoUrl={null}
        shortBio="Pomagam dorosłym."
        modalities={["Spotkania stacjonarne", "Spotkania online"]}
        sections={[
          { label: "Specjalizacje", items: ["Zaburzenia lękowe"] },
          { label: "Certyfikaty", items: [] },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Anna Kowalska" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Psychoterapeutka")).toBeInTheDocument();
    expect(screen.getByText("Spotkania online")).toBeInTheDocument();
    expect(screen.getByText("Zaburzenia lękowe")).toBeInTheDocument();
    expect(screen.queryByText("Certyfikaty")).not.toBeInTheDocument();
  });

  it("uses placeholders for an empty profile", () => {
    render(
      <SpecialistProfilePreview
        displayName=""
        professionalTitle={null}
        photoUrl={null}
        shortBio=""
        modalities={[]}
        sections={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Imię i nazwisko" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tu pojawi się krótki opis.")).toBeInTheDocument();
  });
});
