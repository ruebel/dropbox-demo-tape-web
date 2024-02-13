"use client";

import { useAudio } from "@/hooks/useAudio";
import {
  audioPostionAtom,
  audioStateAtom,
  durationAtom,
  isMutedAtom,
  seekToAtom,
  volumeAtom,
} from "@/state/audio";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import { imageMapAtom } from "@/state/image";
import { removeExtension } from "@/utils/file";
import {
  setMediaDuration,
  setMediaHandlers,
  setMediaState,
  setMediaTrack,
} from "@/utils/mediaSession";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";

export function Audio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    hasNext,
    onNext,
    onPause,
    onPrevious,
    onResume,
    onStop,
    playlist,
    track,
  } = useAudio();
  const [audioState, setAudioState] = useAtom(audioStateAtom);
  const [position, setPosition] = useAtom(audioPostionAtom);
  const [audioDuration, setAudioDuration] = useAtom(durationAtom);
  const imageMap = useAtomValue(imageMapAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const dbx = useAtomValue(dbxAtom);
  const isMuted = useAtomValue(isMutedAtom);
  const volume = useAtomValue(volumeAtom);
  const [seekTo, setSeekTo] = useAtom(seekToAtom);

  const imagePath = imageMap[playlist?.data?.image?.id || ""];

  // Track playing time since Chrome has a bug where it doesn't allways
  // fire the progress event
  useEffect(() => {
    const player = audioRef.current;
    if (!player || audioState !== "playing") return;

    const interval = setInterval(() => {
      setPosition(player.currentTime * 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [audioState, audioRef.current, setPosition]);

  const onSeek = useCallback(
    (positionMs?: number, isForward?: boolean) => {
      let nextPosition = positionMs || 0;

      if (positionMs === undefined) {
        // Handles bumping the position +/- 10 seconds if
        // the user presses the seek buttons instead of using
        // the position bar
        nextPosition = position + (isForward ? 10000 : -10000);
      }

      setSeekTo(nextPosition);
    },
    [position, audioDuration, track?.id]
  );

  // Handle seek changes from controls
  useEffect(() => {
    if (track && seekTo >= 0) {
      const player = audioRef.current;

      if (player) {
        player.currentTime = seekTo / 1000;
      }

      setMediaDuration({
        duration: audioDuration,
        position: seekTo,
      });
      setPosition(seekTo);
      setSeekTo(-1);
    }
  }, [seekTo]);

  // Setup media handlers
  useEffect(() => {
    setMediaHandlers({
      onNext,
      onPrevious,
      onPause,
      onPlay: onResume,
      onSeek,
    });
  }, [onNext, onPause, onResume, onPrevious, onSeek]);

  const handleDurationChange = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    const duration = el.duration;

    setMediaDuration({ duration });
    setAudioDuration(duration * 1000);
  }, [setAudioDuration]);

  const handleEnded = useCallback(() => {
    if (hasNext) {
      onNext();
    } else {
      onStop();
    }
  }, [hasNext, onNext, onStop]);

  const handlePlaying = useCallback(() => {
    setAudioState("playing");
  }, [setAudioState, setPosition]);

  const handleProgress = useCallback(() => {
    const player = audioRef.current;
    if (!player) return;

    setPosition(player.currentTime * 1000);
  }, [setPosition]);

  // Updates media when track changes
  useEffect(() => {
    if (track) {
      setMediaTrack({
        title: removeExtension(track?.name),
        artist: playlist?.data?.artist || playlist?.data?.title,
        album: playlist?.data?.title || "Demo Tape",
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
  }, [track?.id, imagePath, playlist?.meta?.id]);

  // Updates playing track when changes
  useEffect(() => {
    async function updatePlayer() {
      const player = audioRef.current;

      if (!player || !isAuthenticated) return;

      if (track && track.path_lower && audioState === "loading") {
        // This is not a resume so we need to load the file
        const fileLink = await dbx.filesGetTemporaryLink({
          path: track.path_lower,
        });
        player.setAttribute("src", fileLink?.result?.link);

        player.play();
        setMediaState("playing");
      } else if (track && audioState === "playing") {
        player.play();
        setMediaState("playing");
      } else if (audioState === "paused") {
        player.pause();
        setMediaState("paused");
      } else if (audioState === "stopped") {
        player.pause();
        setMediaState("none");
        // clear time so we restart at beginning
        player.currentTime = 0;
      }
    }

    updatePlayer();
  }, [
    audioState,
    isAuthenticated,
    track?.id,
    playlist?.meta?.id,
    dbx,
    audioRef.current,
  ]);

  // Handle volume / mute changes
  useEffect(() => {
    const el = audioRef.current;
    if (!el) {
      return;
    }
    if (isMuted || volume === 0) {
      el.muted = true;
    } else {
      if (el.muted) {
        el.muted = false;
      }
      el.volume = volume;
    }
  }, [volume, isMuted]);

  return (
    <audio
      onDurationChange={handleDurationChange}
      onEnded={handleEnded}
      onPlay={handlePlaying}
      onProgress={handleProgress}
      ref={audioRef}
    />
  );
}
