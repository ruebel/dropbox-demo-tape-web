import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useReducer
} from "react";
import usePlaylist from "./usePlaylist";
import { useDropbox } from "./dropboxContext";

const AudioContext = createContext();

export const audioStates = {
  loading: "loading",
  paused: "paused",
  playing: "playing",
  stopped: "stopped"
};

const defaultState = {
  duration: 0,
  playlistId: null,
  trackId: null,
  state: audioStates.stopped
};

function reducer(state, action) {
  switch (action.type) {
    case "loaded":
      return {
        ...state,
        ...action.payload,
        state: audioStates.playing
      };
    case "pause":
      if (state.state === audioStates.playing) {
        return {
          ...state,
          state: audioStates.paused
        };
      }
      return state;
    case "play":
      return {
        ...state,
        ...action.payload,
        state: audioStates.loading
      };
    case "resume":
      return {
        ...state,
        state: audioStates.playing
      };
    case "stop":
      return {
        ...state,
        state: audioStates.stopped
      };
    default:
      throw new Error();
  }
}

function AudioProvider({ children, initialState = {} }) {
  const [{ duration, playlistId, state, trackId }, dispatch] = useReducer(
    reducer,
    {
      ...defaultState,
      ...initialState
    }
  );
  const audioRef = useRef();
  const { dbx } = useDropbox();
  const playlist = usePlaylist({ playlistId });

  const { hasNext, hasPrevious, track, trackIndex } = useMemo(() => {
    const trackIndex = trackId
      ? playlist?.data?.data.tracks.findIndex(track => track.id === trackId)
      : playlist?.data?.data
      ? 0
      : -1;
    const track =
      trackIndex >= 0 ? playlist.data.data.tracks[trackIndex] : null;
    const hasNext = track
      ? trackIndex < playlist.data.data.tracks.length - 1
      : false;
    const hasPrevious = track ? trackIndex > 0 : false;
    return {
      hasNext,
      hasPrevious,
      track,
      trackIndex
    };
    // eslint-disable-next-line
  }, [trackId, playlistId]);

  useEffect(() => {
    const player = audioRef.current;
    player.addEventListener("playing", e => {
      if (state === audioStates.loading) {
        dispatch({
          type: "loaded",
          payload: {
            duration: e.target.duration * 1000
          }
        });
      }
    });

    player.addEventListener("ended", e => {
      if (hasNext) {
        onNext();
      } else {
        onStop();
      }
    });
  });

  useEffect(() => {
    async function updatePlayer() {
      const player = audioRef.current;

      if (track && state === audioStates.loading) {
        // This is not a resume so we need to load the file
        const fileLink = await dbx.filesGetTemporaryLink({
          path: track.path_lower
        });
        player.setAttribute("src", fileLink.link);

        player.play();
      } else if (track && state === audioStates.playing) {
        player.play();
      } else if (state === audioStates.paused) {
        player.pause();
      } else if (state === audioStates.stopped) {
        player.pause();
        // clear time so we restart at beginning
        player.currentTime = 0;
      }
    }

    updatePlayer();
    // eslint-disable-next-line
  }, [state, trackId, playlistId]);

  function onNext() {
    if (hasNext) {
      dispatch({
        type: "play",
        payload: {
          playlistId,
          trackId: playlist.data.data.tracks[trackIndex + 1].id
        }
      });
    }
  }

  function onPrevious() {
    if (hasPrevious) {
      dispatch({
        type: "play",
        payload: {
          playlistId,
          trackId: playlist.data.data.tracks[trackIndex - 1].id
        }
      });
    }
  }

  function subscribeToProgress(callback) {
    audioRef.current.addEventListener("progress", e => {
      callback(e.target.currentTime * 1000);
    });
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

  function onSeek(positionMs) {
    if (track) {
      const player = audioRef.current;
      player.currentTime = positionMs / 1000;
    }
  }

  function onStop() {
    if (state !== audioStates.stopped) {
      dispatch({ type: "stop" });
    }
  }

  const value = {
    duration,
    hasNext,
    hasPrevious,
    onNext,
    onPause,
    onPlay,
    onPrevious,
    onResume,
    onSeek,
    onStop,
    playlist,
    subscribeToProgress,
    state,
    track
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
      <audio ref={audioRef} />
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
