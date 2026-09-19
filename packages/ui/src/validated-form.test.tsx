import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

const exampleSchema = z.object({
  name: z.string().min(1, "Imię jest wymagane"),
});

type ExampleValues = z.infer<typeof exampleSchema>;

function ValidatedForm({
  onSubmit,
}: {
  onSubmit: (values: ExampleValues) => void;
}) {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ExampleValues>({
    resolver: zodResolver(exampleSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Label htmlFor="name">Imię</Label>
      <Input id="name" {...register("name")} />
      {errors.name ? <p role="alert">{errors.name.message}</p> : null}
      <Button type="submit">Wyślij</Button>
    </form>
  );
}

describe("React Hook Form with Zod", () => {
  it("blocks invalid submission and submits validated values", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<ValidatedForm onSubmit={handleSubmit} />);
    await user.click(screen.getByRole("button", { name: "Wyślij" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Imię jest wymagane",
    );
    expect(handleSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Imię"), "Anna");
    await user.click(screen.getByRole("button", { name: "Wyślij" }));

    expect(handleSubmit).toHaveBeenCalledWith(
      { name: "Anna" },
      expect.anything(),
    );
  });
});
