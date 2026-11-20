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

const song = {
  id: "id:song",
  isFolder: false,
  name: "Song.mp3",
  path: "/Demos/Song.mp3",
  path_lower: "/demos/song.mp3",
  server_modified: "2026-10-01T12:00:00Z",
  type: "file",
} as EnhancedFileMeta;

// Lists Band in every folder, and Song when files are asked for, without
// Dropbox
vi.mock("@/hooks/useFiles", () => ({
  useFiles: ({ showFiles }: { showFiles: boolean }) => ({
    files: showFiles ? [band, song] : [band],
    isLoading: false,
  }),
}));
vi.mock("@/components/Explorer/Entry", () => ({
  Entry: ({
    entry,
    isDisabled,
    onClick,
  }: {
    entry: EnhancedFileMeta;
    isDisabled?: boolean;
    onClick: (entry: EnhancedFileMeta) => void;
  }) => (
    <button disabled={isDisabled} onClick={() => onClick(entry)}>
      Open {entry.name}
    </button>
  ),
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

describe("Explorer with previewFiles", () => {
  afterEach(() => {
    cleanup();
  });

  it("lists files that cannot be clicked, and folders that can", () => {
    const onPathChange = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <Explorer
        initialFolder="/Demos"
        onPathChange={onPathChange}
        onSelectionChange={onSelectionChange}
        previewFiles={true}
      />
    );

    const file = screen.getByRole("button", { name: "Open Song.mp3" });
    expect((file as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(file);
    expect(onSelectionChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Open Band" }));
    expect(onPathChange).toHaveBeenLastCalledWith("/Demos/Band");
  });

  it("lists no files without it", () => {
    render(<Explorer initialFolder="/Demos" />);

    expect(screen.queryByRole("button", { name: "Open Song.mp3" })).toBeNull();
  });
});

describe("Entry", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a disabled button that ignores clicks when disabled", async () => {
    const { Entry } = await vi.importActual<
      typeof import("@/components/Explorer/Entry")
    >("@/components/Explorer/Entry");
    const onClick = vi.fn();
    render(<Entry entry={song} isDisabled={true} onClick={onClick} />);

    const button = screen.getByRole("button", { name: /Song\.mp3/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
