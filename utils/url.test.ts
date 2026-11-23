import { describe, expect, it } from "vitest";

import { getBackUrl } from "@/utils/url";

describe("getBackUrl", () => {
  it("goes from the track and image pickers to the edit page", () => {
    expect(getBackUrl("/playlist/id%3Atape/edit/tracks")).toBe(
      "/playlist/id%3Atape/edit"
    );
    expect(getBackUrl("/playlist/id%3Atape/edit/image")).toBe(
      "/playlist/id%3Atape/edit"
    );
  });

  it("goes from the edit page to the playlist", () => {
    expect(getBackUrl("/playlist/id%3Atape/edit")).toBe("/playlist/id%3Atape");
  });

  it("goes home from a playlist and from the new playlist page", () => {
    expect(getBackUrl("/playlist/id%3Atape")).toBe("/");
    expect(getBackUrl("/playlist/new")).toBe("/");
  });

  it("goes home from a top-level page", () => {
    expect(getBackUrl("/")).toBe("/");
    expect(getBackUrl("/auth")).toBe("/");
  });
});
