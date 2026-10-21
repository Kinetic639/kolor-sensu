import {
  articleDocumentSchema,
  emptyArticleDocument,
  type ArticleDocument,
} from "@repo/contracts/article-rich-text";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ArticleEditor, type UploadedImage } from "./article-editor";
import { sampleArticle } from "./article.fixtures";

// The article editor as an editor uses it: blocks from "Wstaw" and from
// "/", images uploaded and inserted (their text for people who cannot see
// them asked for, the article invalid until given), two images, the
// booking button with a service, and tables (moving blocks: commands.test).

beforeAll(() => {
  // jsdom lays nothing out; the "/" menu and the drag handle ask where
  // the caret is.
  const rect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  };
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  Range.prototype.getClientRects = () =>
    ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: [][Symbol.iterator],
    }) as unknown as DOMRectList;
  document.elementFromPoint = () => null;
});

let uploaded = 0;
const uploadImage = vi.fn(async (): Promise<UploadedImage> => {
  uploaded += 1;
  return {
    src: `articles/0b8c2f2e-5c4f-4c0a-9a1e-3f6c2d1b7a9${uploaded % 10}.webp`,
    width: 1200,
    height: 800,
  };
});

let latest: ArticleDocument = emptyArticleDocument;

function Harness({
  initial = emptyArticleDocument,
}: {
  initial?: ArticleDocument;
}) {
  const [value, setValue] = useState(initial);
  return (
    <ArticleEditor
      imageUrl={(src) => `/media/${src}`}
      onChange={(next) => {
        latest = next;
        setValue(next);
      }}
      services={[{ slug: "konsultacja-psychologiczna", name: "Konsultacja" }]}
      uploadImage={uploadImage}
      value={value}
    />
  );
}

async function ready() {
  return screen.findByRole(
    "textbox",
    { name: "Treść artykułu" },
    { timeout: 3000 },
  );
}

async function insert(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Wstaw" }));
  await user.click(await screen.findByRole("button", { name: label }));
}

const types = () => latest.content.map((node) => node.type);

describe("the article editor", () => {
  it("inserts a box from Wstaw", async () => {
    render(<Harness />);
    await ready();
    await insert("Ramka „Ważne”");
    await waitFor(() => expect(types()).toContain("callout"));
    expect(
      latest.content.find((node) => node.type === "callout"),
    ).toMatchObject({
      attrs: { kind: "important" },
    });
  });

  it("inserts a table with a header row", async () => {
    render(<Harness />);
    await ready();
    await insert("Tabela");
    await waitFor(() => expect(types()).toContain("table"));
    const table = latest.content.find((node) => node.type === "table") as {
      content: { content: { type: string }[] }[];
    };
    expect(table.content).toHaveLength(3);
    expect(
      table.content[0]!.content.every((cell) => cell.type === "tableHeader"),
    ).toBe(true);
    expect(articleDocumentSchema.safeParse(latest).success).toBe(true);
  });

  it("inserts the booking button, its service chosen from the list", async () => {
    render(<Harness />);
    await ready();
    await insert("Przycisk „Umów wizytę”");
    const service = await screen.findByLabelText("Usługa");
    fireEvent.change(service, {
      target: { value: "konsultacja-psychologiczna" },
    });
    await waitFor(() =>
      expect(
        latest.content.find((node) => node.type === "bookingButton"),
      ).toMatchObject({
        attrs: { label: "Umów wizytę", service: "konsultacja-psychologiczna" },
      }),
    );
  });

  it("uploads an image, asks for its text, and is valid once given", async () => {
    const { container } = render(<Harness />);
    await ready();
    await insert("Zdjęcie, grafika lub wykres");
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: {
          files: [new File(["x"], "gabinet.webp", { type: "image/webp" })],
        },
      });
    });
    await waitFor(() => expect(types()).toContain("articleImage"));
    expect(uploadImage).toHaveBeenCalled();
    expect(
      screen.getByText("1 zdjęcie bez opisu dla osób niewidomych."),
    ).toBeVisible();
    expect(articleDocumentSchema.safeParse(latest).success).toBe(false);

    fireEvent.change(screen.getByLabelText("Opis dla osób niewidomych"), {
      target: { value: "Gabinet z fotelem" },
    });
    await waitFor(() =>
      expect(articleDocumentSchema.safeParse(latest).success).toBe(true),
    );
    expect(
      screen.queryByText(/bez opisu dla osób niewidomych/),
    ).not.toBeInTheDocument();
  });

  it("asks for exactly two images side by side", async () => {
    const { container } = render(<Harness />);
    await ready();
    await insert("Dwa zdjęcia obok siebie");
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
      });
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Wybierz dokładnie dwa zdjęcia.",
    );
    await act(async () => {
      fireEvent.change(input, {
        target: {
          files: [
            new File(["x"], "a.png", { type: "image/png" }),
            new File(["y"], "b.png", { type: "image/png" }),
          ],
        },
      });
    });
    await waitFor(() => expect(types()).toContain("articleImagePair"));
  });

  it("lists blocks after a slash, and inserts the chosen one", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(await ready());
    await user.type(
      screen.getByRole("textbox", { name: "Treść artykułu" }),
      "/tab",
    );
    const list = await screen.findByRole("listbox", { name: "Wstaw blok" });
    expect(within(list).getByRole("option", { name: "Tabela" })).toBeVisible();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(types()).toContain("table"));
  });

  it("opens an article with every block, ready to edit", async () => {
    render(<Harness initial={sampleArticle} />);
    await ready();
    expect(
      (await screen.findAllByLabelText(/Opis.*dla osób niewidomych/)).map(
        (input) => (input as HTMLInputElement).value,
      ),
    ).toContain("Jasny gabinet z fotelem przy oknie");
    expect(
      screen.getByLabelText("Kto to powiedział (opcjonalnie)"),
    ).toHaveValue("Anna, klientka centrum");
  });
});
