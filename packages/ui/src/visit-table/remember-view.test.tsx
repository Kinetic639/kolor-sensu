import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RememberView } from "./remember-view";
import { rememberedView, viewQuery } from "./view-cookie";

let search = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/rezerwacje",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  document.cookie = "ks_view_rezerwacje=; max-age=0; path=/";
  replace.mockClear();
});

describe("remembering a table's view", () => {
  it("keeps the filters and sorting, not the open visit or the page", () => {
    expect(
      viewQuery(
        new URLSearchParams(
          "zakres=dzis&wizyta=v1&karta=historia&strona=3&sort=klient",
        ),
      ),
    ).toBe("zakres=dzis&sort=klient");
  });

  it("saves the view in a cookie, the defaults too", () => {
    search = "status=oczekujace&wizyta=v1";
    const { rerender } = render(<RememberView table="rezerwacje" />);
    expect(document.cookie).toContain(
      `ks_view_rezerwacje=${encodeURIComponent("status=oczekujace")}`,
    );
    search = "";
    rerender(<RememberView table="rezerwacje" />);
    expect(document.cookie).toContain("ks_view_rezerwacje=-");
  });

  it("reached from the menu without a view: back to the remembered one", () => {
    document.cookie = `ks_view_rezerwacje=${encodeURIComponent("sort=klient")}; path=/`;
    search = "";
    const { rerender } = render(<RememberView table="rezerwacje" />);
    expect(replace).toHaveBeenCalledWith("/rezerwacje?sort=klient");
    // Once: clearing the view later on the page keeps it clear.
    search = "sort=klient";
    rerender(<RememberView table="rezerwacje" />);
    search = "";
    rerender(<RememberView table="rezerwacje" />);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(document.cookie).toContain("ks_view_rezerwacje=-");
  });

  it("opened without a view: back to the remembered one, if any", () => {
    expect(
      rememberedView(
        "/rezerwacje",
        encodeURIComponent("zakres=dzis&wizyta=v1"),
      ),
    ).toBe("/rezerwacje?zakres=dzis");
    expect(rememberedView("/rezerwacje", "-")).toBeNull();
    expect(rememberedView("/rezerwacje", undefined)).toBeNull();
  });
});
