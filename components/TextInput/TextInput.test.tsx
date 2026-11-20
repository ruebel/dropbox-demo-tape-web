import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TextInput } from "@/components/TextInput/TextInput";

describe("TextInput", () => {
  afterEach(() => {
    cleanup();
  });

  it("names the field by its title and describes it by its error", () => {
    render(
      <TextInput
        error="That title is taken."
        hasError={true}
        onChange={vi.fn()}
        title="Title"
        value="Band"
      />
    );

    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(input.getAttribute("aria-describedby")!)
        ?.textContent
    ).toBe("That title is taken.");
    expect(screen.getByRole("alert").textContent).toBe("That title is taken.");
  });

  it("has no description or alert without an error", () => {
    render(<TextInput onChange={vi.fn()} title="Title" value="Band" />);

    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input.hasAttribute("aria-describedby")).toBe(false);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
