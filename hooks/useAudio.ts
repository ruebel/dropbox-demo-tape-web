import {
  audioStateAtom,
  playingPlaylistIdAtom,
  playingTrackIdAtom,
} from "@/state/audio";
import { playlistAtom } from "@/state/playlists";
import { useAtom, useAtomValue } from "jotai";

export function useAudio() {
  const [playingPlaylistId, setPlayingPlaylistId] = useAtom(
    playingPlaylistIdAtom
  );
  const [playingTrackId, setPlayingTrackId] = useAtom(playingTrackIdAtom);
  const playlist = useAtomValue(playlistAtom(playingPlaylistId));
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

  function onStop() {
    setAudioState("stopped");
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
    onStop,
    playlist,
    track,
  };
}
