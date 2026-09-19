import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

const meta = {
  title: "Primitives/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DesktopRight: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Otwórz panel</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Szczegóły wizyty</SheetTitle>
          <SheetDescription>
            Kontekst i działania pozostają obok głównego widoku.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};

export const MobileBottom: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Otwórz panel mobilny</Button>
      </SheetTrigger>
      <SheetContent className="min-h-[70vh]" side="bottom">
        <SheetHeader>
          <SheetTitle>Nowa rezerwacja</SheetTitle>
          <SheetDescription>
            Mobilny panel zachowuje dostęp do nawigacji i głównej akcji.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};
