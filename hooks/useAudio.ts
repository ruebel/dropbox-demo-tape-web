import {
  audioStateAtom,
  playingPlaylistIdAtom,
  playingTrackIdAtom,
} from "@/state/audio";
import { playlistAtom, updatePlaylistTrackAtom } from "@/state/playlists";
import { updateTrackMeta } from "@/utils/file";
import { FileMeta, PlaylistTrack, TrackErrorCode } from "@/utils/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

export function useAudio() {
  const [playingPlaylistId, setPlayingPlaylistId] = useAtom(
    playingPlaylistIdAtom
  );
  const [playingTrackId, setPlayingTrackId] = useAtom(playingTrackIdAtom);
  const playlist = useAtomValue(playlistAtom(playingPlaylistId));
  const updatePlaylistTrack = useSetAtom(updatePlaylistTrackAtom);
  const [audioState, setAudioState] = useAtom(audioStateAtom);

  const tracks = playlist?.data.tracks || [];
  const trackIndex = tracks.findIndex((t) => t.id === playingTrackId);
  const track = tracks[trackIndex];

  const hasNext = track && trackIndex < tracks.length - 1;
  const hasPrevious = track && trackIndex > 0;

  function onPlay(playlistId: string, trackId: string) {
    setPlayingPlaylistId(playlistId);
    setPlayingTrackId(trackId);
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

  function onPrevious() {
    if (hasPrevious) {
      onPlay(playingPlaylistId, tracks[trackIndex - 1].id);
    }
  }

  function onResume() {
    setAudioState("playing");
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

  function onSetTrackError(error: string, errorCode?: TrackErrorCode) {
    updatePlayingTrack((t) =>
      t.error === error && t.errorCode === errorCode
        ? undefined
        : { ...t, error, errorCode }
    );
  }

  function onStop() {
    setAudioState("stopped");
  }

  function onUpdateTrackMeta(meta: FileMeta) {
    if (!track) return;

    // Undefined when the track is unchanged and has no error to clear
    updatePlayingTrack((t) => updateTrackMeta(t, meta));

    // The id can change when the server rev is updated
    // so we want to update our playing track id
    if (meta.id !== track.id) {
      setPlayingTrackId(meta.id);
    }
  }

  return {
    audioState,
    hasNext,
    hasPrevious,
    onNext,
    onPause,
    onPlay,
    onPrevious,
    onResume,
    onSetTrackDuration,
    onSetTrackError,
    onStop,
    onUpdateTrackMeta,
    playlist,
    track,
  };
}
