import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import {
  ProfilePhotoField,
  ProfileStatusBanner,
  SpecialistProfilePreview,
  TagListField,
} from "./specialist-profile";

const meta = {
  title: "Portal/Specialist Profile",
  parameters: { controls: { disable: true } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// The field is controlled; the form using it holds the list, as this wrapper
// does.
function TagListWithState({ error }: { error?: string }) {
  const [values, setValues] = useState([
    "Zaburzenia lękowe",
    "Obniżony nastrój",
  ]);
  return (
    <div className="max-w-xl">
      <TagListField
        error={error}
        id="specializations"
        label="Specjalizacje"
        onChange={setValues}
        required
        values={values}
      />
    </div>
  );
}

export const TagList: Story = {
  render: () => <TagListWithState />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole("textbox", { name: /Specjalizacje/ });
    await userEvent.type(input, "Trudności w relacjach{Enter}");
    const list = canvas.getByRole("list", { name: "Specjalizacje" });
    await expect(list).toHaveTextContent("Trudności w relacjach");

    await userEvent.click(
      canvas.getByRole("button", { name: "Usuń: Obniżony nastrój" }),
    );
    await expect(list).not.toHaveTextContent("Obniżony nastrój");
  },
};

export const TagListWithError: Story = {
  render: () => (
    <TagListWithState error="Dodaj co najmniej jedną specjalizację." />
  ),
};

const photoCallbacks = { onSelect: fn(), onRemove: fn(), onAdjust: fn() };

export const PhotoFields: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 md:grid-cols-2">
      <ProfilePhotoField
        alt="Anna Nowak"
        description="Widoczny w portalu i na listach specjalistów."
        hint="JPG, PNG lub WebP do 5 MB. Format 1:1."
        id="profile-photo"
        imageUrl="/kolor-sensu/anna.jpg"
        label="Avatar"
        {...photoCallbacks}
      />
      <ProfilePhotoField
        description="Widoczne na stronie publicznej specjalisty."
        hint="JPG, PNG lub WebP do 5 MB. Zalecany format 3:4."
        id="portrait-photo"
        imageUrl={null}
        label="Zdjęcie portretowe"
        shape="portrait"
        {...photoCallbacks}
      />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Usuń: Avatar" }));
    await expect(photoCallbacks.onRemove).toHaveBeenCalled();
  },
};

export const PhotoUploading: Story = {
  render: () => (
    <div className="max-w-sm">
      <ProfilePhotoField
        error="Plik jest za duży. Maksymalny rozmiar to 5 MB."
        id="profile-photo-pending"
        imageUrl="/kolor-sensu/anna.jpg"
        label="Avatar"
        pending
        onRemove={() => {}}
        onSelect={() => {}}
      />
    </div>
  ),
};

export const StatusBanners: Story = {
  render: () => (
    <div className="max-w-3xl space-y-3">
      <ProfileStatusBanner status="draft" />
      <ProfileStatusBanner status="pending_review" />
      <ProfileStatusBanner
        reviewComment="Dodaj zdjęcie portretowe i rozwiń krótki opis."
        status="rejected"
      />
      <ProfileStatusBanner status="published" />
    </div>
  ),
};

export const Preview: Story = {
  render: () => (
    <div className="max-w-md">
      <SpecialistProfilePreview
        displayName="Anna Nowak"
        modalities={["Spotkania stacjonarne", "Spotkania online"]}
        photoUrl="/kolor-sensu/anna.jpg"
        professionalTitle="Psychoterapeutka"
        sections={[
          {
            label: "Specjalizacje",
            items: ["Zaburzenia lękowe", "Obniżony nastrój (depresja)"],
          },
          {
            label: "Nurty pracy",
            items: ["Terapia poznawczo-behawioralna (CBT)"],
          },
          {
            label: "Wykształcenie",
            items: ["Magister psychologii – Uniwersytet Warszawski"],
          },
          { label: "Certyfikaty", items: ["Certyfikat psychoterapeuty PTTPB"] },
          { label: "Języki", items: ["Polski", "Angielski"] },
        ]}
        shortBio="Pomagam osobom dorosłym w lepszym rozumieniu siebie, budowaniu satysfakcjonujących relacji i radzeniu sobie z trudnościami życiowymi."
      />
    </div>
  ),
};

export const EmptyPreview: Story = {
  render: () => (
    <div className="max-w-md">
      <SpecialistProfilePreview
        displayName=""
        modalities={[]}
        photoUrl={null}
        professionalTitle={null}
        sections={[]}
        shortBio=""
      />
    </div>
  ),
};
