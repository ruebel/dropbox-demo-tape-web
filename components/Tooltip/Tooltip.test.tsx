import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Tooltip } from "@/components/Tooltip/Tooltip";

describe("Tooltip", () => {
  afterEach(cleanup);

  it("renders its text as a tooltip with the given id", () => {
    render(<Tooltip id="track-error">Failed to load track</Tooltip>);

    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(tooltip.id).toBe("track-error");
    expect(tooltip.textContent).toBe("Failed to load track");
  });
});
