import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SyncedFolder } from "@/components/SyncedFolder/SyncedFolder";

const folder = { id: "id:band", path: "/Demos/Band", sort: "name" } as const;

describe("SyncedFolder", () => {
  afterEach(() => {
    cleanup();
  });

  it("marks its text with a folder icon described by the folder", () => {
    render(<SyncedFolder folder={folder}>3 tracks</SyncedFolder>);

    const icon = screen.getByRole("img", {
      description: "Synced with /Demos/Band",
      name: "Folder playlist",
    });
    expect(icon.parentElement?.textContent).toContain("3 tracks");
  });

  it("shows the folder in a tooltip instead of a title", () => {
    const { container } = render(
      <SyncedFolder folder={folder}>3 tracks</SyncedFolder>
    );

    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toBe("Synced with /Demos/Band");
    expect(container.querySelector("[title]")).toBeNull();
  });
});
