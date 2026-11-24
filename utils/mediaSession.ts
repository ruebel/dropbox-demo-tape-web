"use client";

const hasSupport = () => "mediaSession" in navigator;

const defaultArtwork: MediaImage[] = [
  {
    src: `/android-icon-96x96.png`,
    sizes: "96x96",
    type: "image/png",
  },
  {
    src: `/android-icon-144x144.png`,
    sizes: "144x144",
    type: "image/png",
  },
  {
    src: `/apple-icon.png`,
    sizes: "180x180",
    type: "image/png",
  },
];

// Tells the lock screen the track's length and where playback is. The app
// counts in milliseconds, and the browser in seconds.
export function setMediaPosition({
  durationMs,
  positionMs = 0,
}: {
  durationMs: number;
  positionMs?: number;
}) {
  if (!hasSupport() || !("setPositionState" in navigator.mediaSession)) {
    return;
  }
  // The browser rejects a length that is not a number yet, such as before the
  // file loads, or that is negative
  if (!(durationMs >= 0)) return;

  const duration = durationMs / 1000;
  navigator.mediaSession.setPositionState({
    duration,
    // The browser also rejects a position past the end
    position: Math.min(Math.max(positionMs / 1000, 0), duration),
    playbackRate: 1,
  });
}

export function setMediaHandlers({
  onNext,
  onPause,
  onPlay,
  onPrevious,
  onSeekBy,
  onSeekTo,
  onStop,
}: {
  // Left out when there is no track to go to, so the lock screen hides or
  // disables the button
  onNext?: () => void;
  onPause: () => void;
  onPlay: () => void;
  onPrevious?: () => void;
  // Both take milliseconds
  onSeekBy: (offsetMs: number) => void;
  onSeekTo: (positionMs: number) => void;
  onStop: () => void;
}) {
  if (hasSupport()) {
    try {
      navigator.mediaSession.setActionHandler("play", onPlay);
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler("pause", onPause);
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler("stop", onStop);
    } catch (e) {}

    try {
      navigator.mediaSession.setActionHandler("nexttrack", onNext ?? null);
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler(
        "previoustrack",
        onPrevious ?? null
      );
    } catch (e) {}

    try {
      navigator.mediaSession.setActionHandler("seekbackward", () =>
        onSeekBy(-10_000)
      );
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler("seekforward", () =>
        onSeekBy(10_000)
      );
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler("seekto", ({ seekTime }) => {
        // The browser gives the time in seconds
        if (seekTime !== undefined) onSeekTo(seekTime * 1000);
      });
    } catch (e) {}
  }
}

export function setMediaTrack({
  album,
  artist = "Demo Tape",
  artwork = defaultArtwork,
  title,
}: {
  album: string;
  artist?: string;
  artwork?: MediaImage[];
  title: string;
}) {
  if (hasSupport()) {
    // eslint-disable-next-line
    navigator.mediaSession.metadata = new MediaMetadata({
      album,
      artist,
      artwork,
      title,
    });
  }
}

// Removes the track from the lock screen and the media notification
export function clearMediaSession() {
  if (!hasSupport()) return;

  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = "none";
  if ("setPositionState" in navigator.mediaSession) {
    // Without a state, the browser forgets the length and position
    navigator.mediaSession.setPositionState();
  }
}

export function setMediaState(state: MediaSessionPlaybackState) {
  if (hasSupport()) {
    navigator.mediaSession.playbackState = state;
  }
}
