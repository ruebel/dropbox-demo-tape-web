import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useReducer,
} from "react";
import usePlaylist from "./usePlaylist";
import { useDropbox } from "./dropboxContext";
import { removeExtension } from "./utils";
import useMediaSession from "./useMediaSession";
import useLocalStorage from "./useLocalStorage";

const AudioContext = createContext();

export const audioStates = {
  loading: "loading",
  paused: "paused",
  playing: "playing",
  stopped: "stopped",
};

const defaultState = {
  duration: 0,
  isMuted: false,
  playlistId: null,
  position: 0,
  trackId: null,
  state: audioStates.stopped,
  volume: 1,
};

function reducer(state, action) {
  switch (action.type) {
    case "duration":
      return {
        ...state,
        ...action.payload,
      };
    case "loaded":
      if (state.state === "loading") {
        return {
          ...state,
          position: 0,
          state: audioStates.playing,
        };
      }
      return state;
    case "mute":
      return {
        ...state,
        isMuted: true,
      };
    case "pause":
      if (state.state === audioStates.playing) {
        return {
          ...state,
          state: audioStates.paused,
        };
      }
      return state;
    case "play":
      return {
        ...state,
        ...action.payload,
        state: audioStates.loading,
      };
    case "position":
      return {
        ...state,
        ...action.payload,
      };
    case "resume":
      return {
        ...state,
        state: audioStates.playing,
      };
    case "stop":
      return {
        ...state,
        position: 0,
        state: audioStates.stopped,
      };
    case "tick":
      return {
        ...state,
        position: state.position + 1000,
      };
    case "unmute":
      return {
        ...state,
        isMuted: false,
      };
    case "volume":
      return {
        ...state,
        ...action.payload,
        isMuted: action.payload.volume === 0,
      };
    default:
      throw new Error();
  }
}

function AudioProvider({ children, initialState = {} }) {
  const [
    { duration, isMuted, playlistId, position, state, trackId, volume },
    dispatch,
  ] = useReducer(reducer, {
    ...defaultState,
    ...initialState,
  });
  const audioRef = useRef();
  const { dbx } = useDropbox();
  const playlist = usePlaylist({ playlistId });
  const media = useMediaSession();
  const [imageMap = {}] = useLocalStorage("playlistImages");

  const { hasNext, hasPrevious, track, trackIndex } = useMemo(() => {
    const trackIndex = trackId
      ? playlist?.data?.data.tracks.findIndex((track) => track.id === trackId)
      : playlist?.data?.data
      ? 0
      : -1;
    const track =
      trackIndex >= 0 ? playlist.data.data.tracks[trackIndex] : null;
    const hasNext = track
      ? trackIndex < playlist.data.data.tracks.length - 1
      : false;
    const hasPrevious = track ? trackIndex > 0 : false;

    if (track) {
      const imagePath = imageMap[playlist?.data?.data?.image?.id];
      media.setTrack({
        title: removeExtension(track?.name),
        artist: playlist?.data?.data?.artist || playlist?.data?.data?.title,
        album: playlist?.data?.data?.title,
        artwork: imagePath
          ? [
              {
                src: imagePath,
                sizes: "50x50",
                type: "image/png",
              },
            ]
          : undefined,
      });
    }

    return {
      hasNext,
      hasPrevious,
      track,
      trackIndex,
    };
    // eslint-disable-next-line
  }, [trackId, playlistId]);

  function handleEnded(e) {
    if (hasNext) {
      onNext();
    } else {
      onStop();
    }
  }

  function handlePlaying(e) {
    dispatch({
      type: "loaded",
    });
  }

  function handleDurationChange(e) {
    const el = audioRef.current;
    if (!el) {
      return;
    }
    media.setDuration({
      duration: el.duration,
    });
    dispatch({
      type: "duration",
      payload: {
        duration: el.duration * 1000,
      },
    });
  }

  function handleProgress(e) {
    const el = audioRef.current;
    if (!el) {
      return;
    }
    dispatch({
      type: "position",
      payload: {
        position: el.currentTime * 1000,
      },
    });
  }

  useEffect(() => {
    async function updatePlayer() {
      const player = audioRef.current;

      if (!player) return;

      if (track && state === audioStates.loading) {
        // This is not a resume so we need to load the file
        const fileLink = await dbx.filesGetTemporaryLink({
          path: track.path_lower,
        });
        player.setAttribute("src", fileLink?.result?.link);

        player.play();
        media.setState("playing");
      } else if (track && state === audioStates.playing) {
        player.play();
        media.setState("playing");
      } else if (state === audioStates.paused) {
        player.pause();
        media.setState("paused");
      } else if (state === audioStates.stopped) {
        player.pause();
        media.setState("none");
        // clear time so we restart at beginning
        player.currentTime = 0;
      }
    }

    updatePlayer();
    // eslint-disable-next-line
  }, [state, trackId, playlistId]);

  useEffect(() => {
    if (state === "playing") {
      const interval = setInterval(() => {
        dispatch({
          type: "tick",
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  });

  function onMute() {
    dispatch({
      type: "mute",
    });
    const el = audioRef.current;
    if (!el) {
      return;
    }
    el.muted = true;
  }

  function onNext() {
    if (hasNext) {
      dispatch({
        type: "play",
        payload: {
          playlistId,
          trackId: playlist.data.data.tracks[trackIndex + 1].id,
        },
      });
    }
  }

  function onPrevious() {
    if (hasPrevious) {
      dispatch({
        type: "play",
        payload: {
          playlistId,
          trackId: playlist.data.data.tracks[trackIndex - 1].id,
        },
      });
    }
  }

  function onPause() {
    if (state !== audioStates.paused) {
      dispatch({ type: "pause" });
    }
  }

  function onPlay({ playlistId, trackId }) {
    dispatch({ type: "play", payload: { playlistId, trackId } });
  }

  function onResume() {
    if (state === audioStates.paused) {
      dispatch({ type: "resume" });
    }
  }

  function onSeek(positionMs, isForward) {
    if (track) {
      const player = audioRef.current;

      let nextPosition = positionMs;

      if (positionMs === undefined) {
        // Handles bumping the position +/- 10 seconds if
        // the user presses the seek buttons instead of using
        // the position bar
        nextPosition = position + (isForward ? 10000 : -10000);
      }

      player.currentTime = nextPosition / 1000;

      media.setDuration({
        duration: duration,
        position: nextPosition,
      });

      dispatch({
        type: "position",
        payload: {
          position: nextPosition,
        },
      });
    }
  }

  function onStop() {
    if (state !== audioStates.stopped) {
      dispatch({ type: "stop" });
    }
  }

  function onUnmute() {
    dispatch({
      type: "unmute",
    });
    const el = audioRef.current;
    if (!el) {
      return;
    }
    el.muted = false;
  }

  function onVolumeChange(vol) {
    dispatch({
      type: "volume",
      payload: {
        volume: vol,
      },
    });
    const el = audioRef.current;
    if (!el) {
      return;
    }
    el.volume = vol;
    el.muted = vol === 0;
  }

  media.setHandlers({
    onNext,
    onPrevious,
    onPause,
    onPlay: onResume,
    onSeek,
  });

  const value = {
    duration,
    hasNext,
    hasPrevious,
    isMuted,
    onMute,
    onNext,
    onPause,
    onPlay,
    onPrevious,
    onResume,
    onSeek,
    onStop,
    onUnmute,
    onVolumeChange,
    playlist,
    position,
    state,
    track,
    volume,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
      {(track || state !== audioStates.stopped) && (
        <audio
          onDurationChange={handleDurationChange}
          onEnded={handleEnded}
          onPlay={handlePlaying}
          onProgress={handleProgress}
          ref={audioRef}
        />
      )}
    </AudioContext.Provider>
  );
}

function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within a AudioProvider");
  }
  return context;
}

export { AudioProvider, useAudio };
