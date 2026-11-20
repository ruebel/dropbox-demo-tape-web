import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Explorer } from "@/components/Explorer/Explorer";
import { EnhancedFileMeta } from "@/utils/types";

const band = {
  id: "id:band",
  name: "Band",
  path: "/Demos/Band",
  path_lower: "/demos/band",
  type: "folder",
} as EnhancedFileMeta;

// Lists Band in every folder, without Dropbox
vi.mock("@/hooks/useFiles", () => ({
  useFiles: () => ({ files: [band], isLoading: false }),
}));
vi.mock("@/components/Explorer/Entry", () => ({
  Entry: ({
    entry,
    onClick,
  }: {
    entry: EnhancedFileMeta;
    onClick: (entry: EnhancedFileMeta) => void;
  }) => <button onClick={() => onClick(entry)}>Open {entry.name}</button>,
}));

describe("Explorer", () => {
  afterEach(() => {
    cleanup();
  });

  it("reports the folder when a folder is opened", () => {
    const onPathChange = vi.fn();
    render(<Explorer initialFolder="/Demos" onPathChange={onPathChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Open Band" }));

    expect(onPathChange).toHaveBeenLastCalledWith("/Demos/Band");
  });

  it("reports the folder when a breadcrumb is clicked", () => {
    const onPathChange = vi.fn();
    render(<Explorer initialFolder="/Demos/Band" onPathChange={onPathChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Demos" }));
    expect(onPathChange).toHaveBeenLastCalledWith("/Demos");

    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(onPathChange).toHaveBeenLastCalledWith("");
  });
});
