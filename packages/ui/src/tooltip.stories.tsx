import { Info } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const meta = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Więcej informacji">
            <Info className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Obłożenie liczone dla bieżącego tygodnia.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
