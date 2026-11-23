import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PathText } from "@/components/PathText/PathText";

function renderText(text: string) {
  const { container } = render(
    <span>
      <PathText text={text} />
    </span>
  );
  return container.firstElementChild as HTMLElement;
}

describe("PathText", () => {
  afterEach(cleanup);

  it("keeps the text as it is", () => {
    expect(renderText("Synced with /Demos/Band").textContent).toBe(
      "Synced with /Demos/Band"
    );
  });

  it("lets the text wrap after each slash", () => {
    expect(renderText("/Demos/Band/Live").innerHTML).toBe(
      "/<wbr>Demos/<wbr>Band/<wbr>Live"
    );
  });

  it("adds nothing to text without a slash", () => {
    expect(renderText("Band").innerHTML).toBe("Band");
  });
});
