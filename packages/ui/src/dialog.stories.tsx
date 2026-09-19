import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Otwórz dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potwierdź zmianę terminu</DialogTitle>
          <DialogDescription>
            Nowy termin zostanie zapisany i wysłany do klienta.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary">Anuluj</Button>
          <Button>Potwierdź</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
