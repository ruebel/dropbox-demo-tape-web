import { useAudio } from "@/hooks/useAudio";
import { useHotkeys } from "react-hotkeys-hook";

// How far the arrow keys move playback
const SKIP_MS = 10_000;

// Space already presses a focused button or link, and the drag-and-drop track
// list uses Space to pick up a track
const SPACE_TARGETS = "a, button, [role='button'], [data-rfd-drag-handle-draggable-id]";

// The drag-and-drop track list moves a picked-up track with the arrow keys
const ARROW_TARGETS = "[data-rfd-drag-handle-draggable-id]";

function isInside(event: KeyboardEvent, selector: string) {
  return event.target instanceof Element && !!event.target.closest(selector);
}

// Space plays and pauses, and the left and right arrows move playback back
// and forward. Text fields, sliders and lists keep their own use of the keys.
export function usePlaybackHotkeys() {
  const { audioState, onPause, onResume, onSeekBy, track } = useAudio();

  useHotkeys(
    "space",
    () => {
      // The play button is also off while a track loads
      if (!track || audioState === "loading") return;

      if (audioState === "playing") {
        onPause();
      } else {
        onResume();
      }
    },
    {
      ignoreEventWhen: (e) => isInside(e, SPACE_TARGETS),
      // Keeps Space from scrolling the page
      preventDefault: true,
    }
  );

  useHotkeys(
    "left, right",
    (e) => onSeekBy(e.key === "ArrowLeft" ? -SKIP_MS : SKIP_MS),
    { ignoreEventWhen: (e) => isInside(e, ARROW_TARGETS) }
  );
}
