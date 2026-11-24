import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearMediaSession,
  setMediaHandlers,
  setMediaPosition,
} from "@/utils/mediaSession";

// jsdom has no Media Session, so the tests give navigator a fake one
function fakeMediaSession() {
  const handlers = new Map<string, MediaSessionActionHandler | null>();
  const session = {
    metadata: null,
    playbackState: "none",
    setActionHandler: vi.fn(
      (action: string, handler: MediaSessionActionHandler | null) => {
        handlers.set(action, handler);
      }
    ),
    setPositionState: vi.fn(),
  };
  Object.defineProperty(navigator, "mediaSession", {
    configurable: true,
    value: session,
  });
  return { handlers, session };
}

function noHandlers() {
  return {
    onNext: vi.fn(),
    onPause: vi.fn(),
    onPlay: vi.fn(),
    onPrevious: vi.fn(),
    onSeekBy: vi.fn(),
    onSeekTo: vi.fn(),
    onStop: vi.fn(),
  };
}

describe("mediaSession", () => {
  let fake: ReturnType<typeof fakeMediaSession>;

  beforeEach(() => {
    fake = fakeMediaSession();
  });

  afterEach(() => {
    // Removes the fake, so navigator is back to jsdom's
    delete (navigator as { mediaSession?: unknown }).mediaSession;
  });

  describe("setMediaPosition", () => {
    it("gives the browser the length and position in seconds", () => {
      setMediaPosition({ durationMs: 180_000, positionMs: 90_000 });

      expect(fake.session.setPositionState).toHaveBeenCalledWith({
        duration: 180,
        position: 90,
        playbackRate: 1,
      });
    });

    it("keeps the position within the track", () => {
      setMediaPosition({ durationMs: 180_000, positionMs: 200_000 });
      setMediaPosition({ durationMs: 180_000, positionMs: -5_000 });

      const positions = fake.session.setPositionState.mock.calls.map(
        ([state]) => state.position
      );
      expect(positions).toEqual([180, 0]);
    });

    it("skips a length the browser would reject", () => {
      setMediaPosition({ durationMs: NaN });
      setMediaPosition({ durationMs: -1 });

      expect(fake.session.setPositionState).not.toHaveBeenCalled();
    });
  });

  describe("clearMediaSession", () => {
    it("removes the track, its state and its position", () => {
      fake.session.metadata = {} as never;
      fake.session.playbackState = "playing";

      clearMediaSession();

      expect(fake.session.metadata).toBeNull();
      expect(fake.session.playbackState).toBe("none");
      expect(fake.session.setPositionState).toHaveBeenCalledWith();
    });
  });

  describe("setMediaHandlers", () => {
    it("seeks to the lock screen's time in milliseconds", () => {
      const handlers = noHandlers();
      setMediaHandlers(handlers);

      fake.handlers.get("seekto")?.({ action: "seekto", seekTime: 90 });

      expect(handlers.onSeekTo).toHaveBeenCalledWith(90_000);
    });

    it("stops from the lock screen", () => {
      const handlers = noHandlers();
      setMediaHandlers(handlers);

      fake.handlers.get("stop")?.({ action: "stop" });

      expect(handlers.onStop).toHaveBeenCalled();
    });

    it("removes next and previous when they are left out", () => {
      setMediaHandlers({
        ...noHandlers(),
        onNext: undefined,
        onPrevious: undefined,
      });

      expect(fake.handlers.get("nexttrack")).toBeNull();
      expect(fake.handlers.get("previoustrack")).toBeNull();
    });
  });
});
