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

const cover = {
  id: "id:cover",
  isFolder: false,
  name: "Cover.jpg",
  path: "/Demos/Cover.jpg",
  path_lower: "/demos/cover.jpg",
  server_modified: "2026-10-01T12:00:00Z",
  type: "file",
} as EnhancedFileMeta;

// Lists Band in every folder, Song when files are asked for, and Cover when
// images are asked for, without Dropbox
vi.mock("@/hooks/useFiles", () => ({
  useFiles: ({
    showFiles,
    showImages,
  }: {
    showFiles: boolean;
    showImages: boolean;
  }) => ({
    files: showFiles ? [band, song] : showImages ? [band, cover] : [band],
    isLoading: false,
  }),
}));
// Has a thumbnail for Cover, but only when thumbnails are turned on
vi.mock("@/hooks/useThumbnails", () => ({
  useThumbnails: (_files: EnhancedFileMeta[], enabled: boolean) =>
    new Map(enabled ? [["/demos/cover.jpg", "data:cover"]] : []),
}));
vi.mock("@/components/Explorer/Entry", () => ({
  Entry: ({
    entry,
    isDisabled,
    onClick,
    thumbnail,
  }: {
    entry: EnhancedFileMeta;
    isDisabled?: boolean;
    onClick: (entry: EnhancedFileMeta) => void;
    thumbnail?: string;
  }) => (
    <button
      data-thumbnail={thumbnail}
      disabled={isDisabled}
      onClick={() => onClick(entry)}
    >
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

describe("Explorer with showImages", () => {
  afterEach(() => {
    cleanup();
  });

  it("gives each image its thumbnail", () => {
    render(<Explorer initialFolder="/Demos" showImages={true} />);

    const image = screen.getByRole("button", { name: "Open Cover.jpg" });
    expect(image.dataset.thumbnail).toBe("data:cover");
    const folder = screen.getByRole("button", { name: "Open Band" });
    expect(folder.dataset.thumbnail).toBeUndefined();
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

describe("Entry for an image", () => {
  afterEach(() => {
    cleanup();
  });

  async function renderImageEntry(props: {
    isSelected?: boolean;
    thumbnail?: string;
  }) {
    const { Entry } = await vi.importActual<
      typeof import("@/components/Explorer/Entry")
    >("@/components/Explorer/Entry");
    return render(<Entry entry={cover} onClick={vi.fn()} {...props} />);
  }

  it("shows the thumbnail", async () => {
    const { container } = await renderImageEntry({ thumbnail: "data:cover" });

    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "data:cover"
    );
  });

  it("shows an icon while there is no thumbnail", async () => {
    const { container } = await renderImageEntry({});

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("keeps the thumbnail when selected, with a check badge on it", async () => {
    const { container } = await renderImageEntry({
      isSelected: true,
      thumbnail: "data:cover",
    });

    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "data:cover"
    );
    // The check badge is the only icon
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });
});
