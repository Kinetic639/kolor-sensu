import { defaultSiteAppearance } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  mapSiteAppearanceViewModel,
  toSiteAppearanceContent,
} from "./appearance-editor";

// The site's shared settings in the CMS: each image's address to preview,
// the draft as saved.

const url = (path: string) => `https://media.example.invalid/${path}`;

describe("the shared settings' draft", () => {
  it("previews each chosen image and none where the site's own is used", () => {
    const model = mapSiteAppearanceViewModel(
      {
        draft: {
          watercolorBackdropPath: "appearance/a.webp",
          watercolorParallaxPath: null,
        },
        published: null,
        publishedAt: null,
        updatedAt: "2026-10-19T10:00:00Z",
      },
      url,
    );
    expect(model.content).toEqual({
      watercolorBackdropPath: "appearance/a.webp",
      watercolorBackdropUrl: "https://media.example.invalid/appearance/a.webp",
      watercolorParallaxPath: null,
      watercolorParallaxUrl: null,
    });
    expect(model.hasUnpublishedChanges).toBe(true);
  });

  it("saves without the preview addresses", () => {
    expect(
      toSiteAppearanceContent({
        ...defaultSiteAppearance,
        watercolorParallaxPath: "appearance/b.png",
        watercolorBackdropUrl: null,
        watercolorParallaxUrl: url("appearance/b.png"),
      }),
    ).toEqual({
      watercolorBackdropPath: null,
      watercolorParallaxPath: "appearance/b.png",
    });
  });
});
