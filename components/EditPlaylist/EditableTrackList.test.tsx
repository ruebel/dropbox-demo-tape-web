import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditableTrackList } from "@/components/EditPlaylist/EditableTrackList";
import { transformFile } from "@/utils/file";
import { FileMeta, PlaylistTrack } from "@/utils/types";

function file(path: string) {
  return transformFile({
    ".tag": "file",
    id: `id:${path}`,
    name: path.split("/").pop(),
    path_display: path,
    path_lower: path.toLowerCase(),
  } as FileMeta);
}

const SPACE = 32;
const ARROW_DOWN = 40;

const a = file("/Band/a.mp3");
const b = file("/Band/b.mp3");

function renderList(onTrackChange = vi.fn(), canDelete = true) {
  render(
    <EditableTrackList
      canDelete={canDelete}
      onTrackChange={onTrackChange}
      tracks={[a, b]}
    />
  );
  return onTrackChange;
}

// The element that starts a drag for each track
function dragHandles() {
  return [
    ...document.querySelectorAll<HTMLElement>("[data-rfd-drag-handle-draggable-id]"),
  ];
}

function ids(tracks: PlaylistTrack[]) {
  return tracks.map((track) => track.id);
}

describe("EditableTrackList", () => {
  afterEach(cleanup);

  it("makes each whole row the drag handle", () => {
    renderList();

    const handles = dragHandles();
    expect(handles).toHaveLength(2);
    expect(handles[0].textContent).toContain("a");
    expect(handles[0].tabIndex).toBe(0);
  });

  it("still removes a track with the button inside the row", () => {
    const onTrackChange = renderList();

    fireEvent.click(screen.getAllByRole("button", { name: "Remove track" })[0]);

    expect(ids(onTrackChange.mock.calls[0][0])).toEqual([b.id]);
  });

  it("moves a track with the keyboard from anywhere on the row", async () => {
    vi.useFakeTimers();
    const onTrackChange = renderList(vi.fn(), false);
    const [first] = dragHandles();

    first.focus();
    // Space lifts the track, the down arrow moves it, and space drops it. The
    // drag library reads keyCode.
    fireEvent.keyDown(first, { keyCode: SPACE });
    await act(async () => vi.runAllTimers());
    fireEvent.keyDown(first, { keyCode: ARROW_DOWN });
    await act(async () => vi.runAllTimers());
    fireEvent.keyDown(first, { keyCode: SPACE });
    await act(async () => vi.runAllTimers());
    vi.useRealTimers();

    expect(ids(onTrackChange.mock.calls[0][0])).toEqual([b.id, a.id]);
  });
});
