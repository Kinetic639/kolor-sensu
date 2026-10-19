import {
  defaultHomeHeaders,
  defaultRoomsPageContent,
  type Service,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  mapFirstStepsViewModel,
  mapHomeHeadersViewModel,
  mapHomeSectionsViewModel,
  pageStatus,
  mapRoomsPageViewModel,
  mapSupportAreasViewModel,
} from "./view-model";

const base = {
  draft: { ...defaultRoomsPageContent, showLocationDetails: false },
  published: { ...defaultRoomsPageContent, showLocationDetails: true },
  publishedAt: "2026-09-27T10:00:00Z",
  updatedAt: "2026-09-27T11:00:00Z",
};

describe("mapRoomsPageViewModel", () => {
  it("edits the draft and notices it differs from what is published", () => {
    const model = mapRoomsPageViewModel(base);
    expect(model).toMatchObject({
      showAmenitiesSection: true,
      showLocationDetails: false,
      isPublished: true,
      hasUnpublishedChanges: true,
    });
    expect(model.publishedAtLabel).not.toBeNull();
  });

  it("notices changed words too", () => {
    expect(
      mapRoomsPageViewModel({
        ...base,
        draft: { ...base.published, amenitiesHeading: "Na miejscu" },
      }).hasUnpublishedChanges,
    ).toBe(true);
  });

  it("has nothing to publish when the draft matches", () => {
    expect(
      mapRoomsPageViewModel({ ...base, draft: base.published })
        .hasUnpublishedChanges,
    ).toBe(false);
  });

  it("treats a never-published page as having changes", () => {
    const model = mapRoomsPageViewModel({
      ...base,
      published: null,
      publishedAt: null,
    });
    expect(model.isPublished).toBe(false);
    expect(model.hasUnpublishedChanges).toBe(true);
    expect(model.publishedAtLabel).toBeNull();
  });
});

describe("mapSupportAreasViewModel", () => {
  const area = {
    id: "indywidualna",
    title: "Terapia indywidualna",
    lead: "Opis.",
    imagePath: "support-areas/a.webp",
    imageAlt: "Gabinet",
    link: null,
  };
  const content = {
    draft: { areas: [area] },
    published: { areas: [area] },
    publishedAt: "2026-10-13T10:00:00Z",
    updatedAt: "2026-10-13T11:00:00Z",
  };
  const url = (path: string) => `https://cdn.test/${path}`;

  it("lists the draft's areas, each photo as an address to preview", () => {
    const model = mapSupportAreasViewModel(content, url);
    expect(model.areas).toEqual([
      { ...area, imageUrl: "https://cdn.test/support-areas/a.webp" },
    ]);
    expect(model.isPublished).toBe(true);
    expect(model.hasUnpublishedChanges).toBe(false);
  });

  it("notices a draft that differs from what is published", () => {
    const model = mapSupportAreasViewModel(
      { ...content, draft: { areas: [{ ...area, title: "Inny tytuł" }] } },
      url,
    );
    expect(model.hasUnpublishedChanges).toBe(true);
  });

  it("treats never-published areas as having changes, without photos as none", () => {
    const model = mapSupportAreasViewModel(
      {
        ...content,
        draft: { areas: [{ ...area, imagePath: null }] },
        published: null,
        publishedAt: null,
      },
      url,
    );
    expect(model.isPublished).toBe(false);
    expect(model.hasUnpublishedChanges).toBe(true);
    expect(model.areas[0]?.imageUrl).toBeNull();
  });
});

describe("mapHomeSectionsViewModel", () => {
  const sections = {
    showSpecialists: true,
    spotlight: {
      visible: true,
      specialistId: "6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10",
      imagePath: "spotlight/a.webp",
      imageAlt: "",
    },
  };
  const content = {
    draft: sections,
    published: sections,
    publishedAt: "2026-10-13T10:00:00Z",
    updatedAt: "2026-10-13T11:00:00Z",
  };
  const summary = (overrides: Record<string, unknown>) =>
    ({
      id: "6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10",
      firstName: "Anna",
      lastName: "Nowak",
      publicDisplayName: "Anna Nowak",
      active: true,
      publicationStatus: "published",
      ...overrides,
    }) as never;

  it("lists the specialists to choose from, saying who is on the site", () => {
    const model = mapHomeSectionsViewModel(
      content,
      (path) => `https://cdn.test/${path}`,
      [
        summary({}),
        summary({
          id: "b",
          firstName: "Tomasz",
          lastName: "Wójcik",
          publicDisplayName: null,
          active: false,
        }),
      ],
    );
    expect(model.specialists).toEqual([
      {
        id: "6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10",
        name: "Anna Nowak",
        onSite: true,
      },
      { id: "b", name: "Tomasz Wójcik", onSite: false },
    ]);
    expect(model.spotlight.imageUrl).toBe("https://cdn.test/spotlight/a.webp");
    expect(model.hasUnpublishedChanges).toBe(false);
  });

  it("notices changes not yet published", () => {
    const model = mapHomeSectionsViewModel(
      { ...content, draft: { ...sections, showSpecialists: false } },
      (path) => path,
      [],
    );
    expect(model.hasUnpublishedChanges).toBe(true);
  });
});

describe("pageStatus", () => {
  const section = (overrides: Record<string, unknown> = {}) => ({
    isPublished: true,
    hasUnpublishedChanges: false,
    publishedAt: "2026-10-13T10:00:00Z",
    updatedAt: "2026-10-13T10:00:00Z",
    ...overrides,
  });

  it("is published with nothing pending when every section is", () => {
    const status = pageStatus([section(), section()]);
    expect(status.isPublished).toBe(true);
    expect(status.hasUnpublishedChanges).toBe(false);
    expect(status.publishedAtLabel).not.toBeNull();
  });

  it("has changes when any section has, and is unpublished while any never was", () => {
    const status = pageStatus([
      section(),
      section({
        isPublished: false,
        hasUnpublishedChanges: true,
        publishedAt: null,
      }),
    ]);
    expect(status.isPublished).toBe(false);
    expect(status.hasUnpublishedChanges).toBe(true);
  });

  it("dates the page by its latest publish and latest edit", () => {
    const status = pageStatus([
      section({
        publishedAt: "2026-10-01T10:00:00Z",
        updatedAt: "2026-10-01T10:00:00Z",
      }),
      section({
        publishedAt: "2026-10-12T10:00:00Z",
        updatedAt: "2026-10-13T12:00:00Z",
      }),
    ]);
    expect(status.publishedAtLabel).toBe(
      pageStatus([section({ publishedAt: "2026-10-12T10:00:00Z" })])
        .publishedAtLabel,
    );
    expect(status.updatedAtLabel).toBe(
      pageStatus([section({ updatedAt: "2026-10-13T12:00:00Z" })])
        .updatedAtLabel,
    );
  });

  it("is not published when no section loaded", () => {
    expect(pageStatus([]).isPublished).toBe(false);
  });
});

describe("mapFirstStepsViewModel", () => {
  const steps = {
    visible: true,
    steps: [1, 2, 3, 4].map((n) => ({ title: `Krok ${n}`, text: "Opis." })),
  };
  const content = {
    draft: steps,
    published: steps,
    publishedAt: "2026-10-13T10:00:00Z",
    updatedAt: "2026-10-13T11:00:00Z",
  };

  it("edits the draft and knows it is published as it stands", () => {
    const model = mapFirstStepsViewModel(content);
    expect(model.steps).toHaveLength(4);
    expect(model.hasUnpublishedChanges).toBe(false);
  });

  it("notices a draft that differs from what is published", () => {
    expect(
      mapFirstStepsViewModel({
        ...content,
        draft: { ...steps, visible: false },
      }).hasUnpublishedChanges,
    ).toBe(true);
  });
});

describe("mapHomeHeadersViewModel", () => {
  const service = (overrides: Partial<Service>): Service => ({
    id: "s1",
    name: "Konsultacja psychologiczna",
    slug: "konsultacja-psychologiczna",
    shortDescription: null,
    description: null,
    category: "other",
    defaultDurationMinutes: 50,
    afterMinutes: 0,
    active: true,
    publiclyVisible: true,
    bookingEnabled: true,
    requiresIntake: true,
    sortOrder: 0,
    catalogId: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  });

  it("offers for booking links only the services clients can book online", () => {
    const model = mapHomeHeadersViewModel(
      {
        draft: defaultHomeHeaders,
        published: defaultHomeHeaders,
        publishedAt: "2026-10-14T06:36:31Z",
        updatedAt: "2026-10-14T06:36:31Z",
      },
      [
        service({}),
        service({ slug: "ukryta", publiclyVisible: false }),
        service({ slug: "bez-rezerwacji", bookingEnabled: false }),
        service({ slug: "nieaktywna", active: false }),
      ],
    );
    expect(model.services).toEqual([
      {
        slug: "konsultacja-psychologiczna",
        name: "Konsultacja psychologiczna",
        requiresIntake: true,
      },
    ]);
    expect(model.hasUnpublishedChanges).toBe(false);
  });
});
