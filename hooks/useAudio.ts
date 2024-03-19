import {
  audioStateAtom,
  playingPlaylistIdAtom,
  playingTrackIdAtom,
} from "@/state/audio";
import { playlistAtom } from "@/state/playlists";
import { replaceItemAtIndex } from "@/utils/list";
import { useAtom } from "jotai";

export function useAudio() {
  const [playingPlaylistId, setPlayingPlaylistId] = useAtom(
    playingPlaylistIdAtom
  );
  const [playingTrackId, setPlayingTrackId] = useAtom(playingTrackIdAtom);
  const [playlist, setPlaylist] = useAtom(playlistAtom(playingPlaylistId));
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

  function onSetTrackDuration(duration: number) {
    // Ensure that we are currently playing a track and that the duration is different
    // from what we have stored in the playlist
    if (playlist && track && trackIndex > -1 && track.duration !== duration) {
      const updatedTrack = { ...track, duration };

      // Save the new duration in the playlist so we have it preloaded next time
      setPlaylist({
        ...playlist,
        data: {
          ...playlist.data,
          tracks: replaceItemAtIndex(tracks, trackIndex, updatedTrack),
        },
      });
    }
  }

  function onSetTrackError(error: string | undefined) {
    // Ensure that we are currently playing a track
    if (playlist && track && trackIndex > -1) {
      const updatedTrack = { ...track, error };

      // Save the new duration in the playlist so we have it preloaded next time
      setPlaylist({
        ...playlist,
        data: {
          ...playlist.data,
          tracks: replaceItemAtIndex(tracks, trackIndex, updatedTrack),
        },
      });
    }
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
    onSetTrackDuration,
    onSetTrackError,
    onStop,
    playlist,
    track,
  };
}
