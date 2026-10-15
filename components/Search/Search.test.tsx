import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Search } from "@/components/Search/Search";

const MAC_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

function renderSearch() {
  render(<Search onChange={vi.fn()} value="" />);
  return screen.getByPlaceholderText("Search");
}

function pressKey(init: KeyboardEventInit) {
  fireEvent.keyDown(document.body, init);
}

describe("Search hotkey", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("focuses the input on Ctrl+F outside macOS", () => {
    const input = renderSearch();

    pressKey({ key: "f", code: "KeyF", ctrlKey: true });

    expect(document.activeElement).toBe(input);
  });

  it("focuses the input on Cmd+F on macOS", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(MAC_USER_AGENT);
    const input = renderSearch();

    pressKey({ key: "f", code: "KeyF", metaKey: true });

    expect(document.activeElement).toBe(input);
  });

  it("follows the keyboard layout (Dvorak types f with the Y key)", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(MAC_USER_AGENT);
    const input = renderSearch();

    pressKey({ key: "f", code: "KeyY", metaKey: true });

    expect(document.activeElement).toBe(input);
  });

  it("ignores F without a modifier", () => {
    const input = renderSearch();

    pressKey({ key: "f", code: "KeyF" });

    expect(document.activeElement).not.toBe(input);
  });
});
