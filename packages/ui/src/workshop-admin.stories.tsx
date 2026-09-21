import type { Meta, StoryObj } from "@storybook/react";
import { WorkshopModalityBadge, WorkshopStatusBadge } from "./workshop-admin";

const meta = { title: "Portal/Admin Workshops" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Statuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <WorkshopStatusBadge status="draft" />
      <WorkshopStatusBadge status="published" />
      <WorkshopStatusBadge status="cancelled" />
      <WorkshopStatusBadge status="completed" />
    </div>
  ),
};

export const Modalities: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <WorkshopModalityBadge modality="in_person" />
      <WorkshopModalityBadge modality="online" />
    </div>
  ),
};
