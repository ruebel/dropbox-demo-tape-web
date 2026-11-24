import {
  audioPostionAtom,
  audioStateAtom,
  durationAtom,
  playingPlaylistIdAtom,
  playingTrackIdAtom,
  seekToAtom,
  sessionTrackErrorsAtom,
} from "@/state/audio";
import { playlistAtom, updatePlaylistTrackAtom } from "@/state/playlists";
import { updateTrackMeta } from "@/utils/file";
import { FileMeta, PlaylistTrack, TrackErrorCode } from "@/utils/types";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";

// From this far into a track, previous restarts it
const RESTART_AFTER_MS = 3000;

export function useAudio() {
  const [playingPlaylistId, setPlayingPlaylistId] = useAtom(
    playingPlaylistIdAtom
  );
  const [playingTrackId, setPlayingTrackId] = useAtom(playingTrackIdAtom);
  const playlist = useAtomValue(playlistAtom(playingPlaylistId));
  const updatePlaylistTrack = useSetAtom(updatePlaylistTrackAtom);
  const setSessionTrackErrors = useSetAtom(sessionTrackErrorsAtom);
  const [audioState, setAudioState] = useAtom(audioStateAtom);
  const setSeekTo = useSetAtom(seekToAtom);
  // Reads and sets the position only when needed, so components that use this
  // hook do not re-render every time the position changes
  const store = useStore();

  const tracks = playlist?.data.tracks || [];
  const trackIndex = tracks.findIndex((t) => t.id === playingTrackId);
  const track = tracks[trackIndex];

  const hasNext = track && trackIndex < tracks.length - 1;
  const hasPrevious = track && trackIndex > 0;

  function onPlay(playlistId: string, trackId: string) {
    setPlayingPlaylistId(playlistId);
    setPlayingTrackId(trackId);
    // The new track starts at the beginning. Otherwise the last track's
    // position shows until this one plays, and previous would restart this
    // track instead of going back.
    store.set(audioPostionAtom, 0);
    setAudioState("loading");
  }

  function onNext() {
    if (hasNext) {
      onPlay(playingPlaylistId, tracks[trackIndex + 1].id);
    }
  }

  function onPause() {
    setAudioState("paused");
  }

  // Goes to the previous track near the start of a track. Further in, or on
  // the first track, it restarts the track instead, like most players.
  function onPrevious() {
    if (!track) return;

    if (hasPrevious && store.get(audioPostionAtom) < RESTART_AFTER_MS) {
      onPlay(playingPlaylistId, tracks[trackIndex - 1].id);
    } else {
      onSeekTo(0);
    }
  }

  function onResume() {
    setAudioState("playing");
  }

  // Moves playback forward, or back when `offsetMs` is negative
  function onSeekBy(offsetMs: number) {
    onSeekTo(store.get(audioPostionAtom) + offsetMs);
  }

  // Moves playback to `positionMs`, kept between the start and the end of the
  // track. The end is unknown until the file loads.
  function onSeekTo(positionMs: number) {
    if (!track) return;

    const durationMs = store.get(durationAtom);
    const end = durationMs > 0 ? durationMs : Infinity;
    setSeekTo(Math.min(Math.max(positionMs, 0), end));
  }

  // Saves a change to the playing track. The update runs against the latest
  // saved track, not the one from this render, so changes made close together
  // do not overwrite each other.
  function updatePlayingTrack(
    update: (track: PlaylistTrack) => PlaylistTrack | undefined
  ) {
    if (!playlist || !track) return;

    updatePlaylistTrack({
      playlistId: playlist.meta.id,
      trackId: track.id,
      update,
    });
  }

  function onSetTrackDuration(duration: number) {
    // Save the new duration in the playlist so we have it preloaded next time
    updatePlayingTrack((t) =>
      t.duration === duration ? undefined : { ...t, duration }
    );
  }

  // Saves the error in the shared playlist, for errors about the file itself
  function onSetTrackError(error: string, errorCode?: TrackErrorCode) {
    updatePlayingTrack((t) =>
      t.error === error && t.errorCode === errorCode
        ? undefined
        : { ...t, error, errorCode }
    );
  }

  // Shows the error for this session only, for errors that say nothing about
  // the file, such as a dropped connection
  function onSetSessionTrackError(error: string) {
    if (!track) return;
    setSessionTrackErrors((errors) => ({ ...errors, [track.id]: error }));
  }

  function onStop() {
    setAudioState("stopped");
  }

  function onUpdateTrackMeta(meta: FileMeta) {
    if (!track) return;

    // Undefined when the track is unchanged and has no error to clear
    updatePlayingTrack((t) => updateTrackMeta(t, meta));

    // The track loaded, so a session error from an earlier try is out of date
    const trackId = track.id;
    setSessionTrackErrors((errors) => {
      if (!(trackId in errors)) return errors;
      const remaining = { ...errors };
      delete remaining[trackId];
      return remaining;
    });

    // The id can change when the server rev is updated
    // so we want to update our playing track id
    if (meta.id !== track.id) {
      setPlayingTrackId(meta.id);
    }
  }

  return {
    audioState,
    hasNext,
    onNext,
    onPause,
    onPlay,
    onPrevious,
    onResume,
    onSeekBy,
    onSeekTo,
    onSetSessionTrackError,
    onSetTrackDuration,
    onSetTrackError,
    onStop,
    onUpdateTrackMeta,
    playlist,
    track,
  };
}
