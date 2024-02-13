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
    src: `/android-icon-180x180.png`,
    sizes: "180x180",
    type: "image/png",
  },
];

export function setMediaDuration({
  duration = 0,
  position = 0,
  playbackRate = 1,
}) {
  if (hasSupport() && "setPositionState" in navigator.mediaSession) {
    window.navigator.mediaSession.setPositionState({
      duration,
      position,
      playbackRate,
    });
  }
}

export function setMediaHandlers({
  onNext,
  onPause,
  onPlay,
  onPrevious,
  onSeek,
}: {
  onNext: () => void;
  onPause: () => void;
  onPlay: () => void;
  onPrevious: () => void;
  onSeek: (positionMs?: number, isForward?: boolean) => void;
}) {
  if (hasSupport()) {
    try {
      navigator.mediaSession.setActionHandler("play", onPlay);
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler("pause", onPause);
    } catch (e) {}

    try {
      navigator.mediaSession.setActionHandler("nexttrack", onNext);
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler("previoustrack", onPrevious);
    } catch (e) {}

    try {
      navigator.mediaSession.setActionHandler("seekbackward", () =>
        onSeek(undefined, false)
      );
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler("seekforward", () =>
        onSeek(undefined, true)
      );
    } catch (e) {}
    try {
      navigator.mediaSession.setActionHandler("seekto", ({ seekTime }) =>
        onSeek(seekTime)
      );
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

export function setMediaState(state: MediaSessionPlaybackState) {
  if (hasSupport()) {
    navigator.mediaSession.playbackState = state;
  }
}
