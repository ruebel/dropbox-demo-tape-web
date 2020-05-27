const hasSupport = "mediaSession" in navigator;

const defaultArtwork = [
  {
    src: "android-icon-96x96.png",
    sizes: "96x96",
    type: "image/png",
  },
  {
    src: "android-icon-144x144.png",
    sizes: "144x144",
    type: "image/png",
  },
  {
    src: "android-icon-180x180.png",
    sizes: "180x180",
    type: "image/png",
  },
];

function useMediaSession() {
  function setDuration({ duration, position = 0, playbackRate = 1 }) {
    if (hasSupport && "setPositionState" in navigator.mediaSession) {
      window.navigator.mediaSession.setPositionState({
        duration,
        position,
        playbackRate,
      });
    }
  }

  function setHandlers({ onNext, onPause, onPlay, onPrevious, onSeek }) {
    if (hasSupport) {
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

  function setTrack({
    album,
    artist = "Demo Tape",
    artwork = defaultArtwork,
    title,
  }) {
    if (hasSupport) {
      // eslint-disable-next-line
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork,
      });
    }
  }

  function setState(state) {
    if (hasSupport) {
      navigator.mediaSession.playbackState = state;
    }
  }

  return {
    setDuration,
    setHandlers,
    setState,
    setTrack,
  };
}

export default useMediaSession;
