"use client";

import { getTrackLink } from "@/api/track";
import { useAudio } from "@/hooks/useAudio";
import { logError } from "@/hooks/useErrorTracking";
import {
  audioPostionAtom,
  audioStateAtom,
  durationAtom,
  isMutedAtom,
  seekToAtom,
  volumeAtom,
} from "@/state/audio";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import { brokenImageIdsAtom, imageMapAtom } from "@/state/image";
import {
  getMediaErrorMessage,
  getTrackErrorMessage,
  isPathNotFoundError,
  isTransientError,
  MEDIA_ERROR,
} from "@/utils/error";
import { getImageMimeType, removeExtension } from "@/utils/file";
import {
  setMediaPosition,
  setMediaHandlers,
  setMediaState,
  setMediaTrack,
} from "@/utils/mediaSession";
import { FileMeta, TrackErrorCode } from "@/utils/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

type TrackFailure = {
  errorCode?: TrackErrorCode;
  // Says nothing about the file, so it is not saved in the shared playlist
  isTransient: boolean;
  message: string;
};

export function Audio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  // The track whose link is the audio element's source
  const loadedTrackIdRef = useRef<string | undefined>(undefined);
  // The track that already got a fresh link after an audio error, so a
  // second error fails it instead of retrying forever
  const retriedTrackIdRef = useRef<string | undefined>(undefined);
  // Where to pick up after reloading a track that stopped with an error
  const resumeAtRef = useRef<number | undefined>(undefined);
  // Bumped to load the current track again even when already "loading"
  const [reloadCount, setReloadCount] = useState(0);
  const {
    hasNext,
    onNext,
    onPause,
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
  } = useAudio();
  const [audioState, setAudioState] = useAtom(audioStateAtom);
  const setPosition = useSetAtom(audioPostionAtom);
  const setAudioDuration = useSetAtom(durationAtom);
  const imageMap = useAtomValue(imageMapAtom);
  const brokenImageIds = useAtomValue(brokenImageIdsAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const dbx = useAtomValue(dbxAtom);
  const isMuted = useAtomValue(isMutedAtom);
  const volume = useAtomValue(volumeAtom);
  const [seekTo, setSeekTo] = useAtom(seekToAtom);

  const image = playlist?.data?.image;
  // A broken image would leave the lock screen blank, so use the app icons
  const imagePath =
    image && !brokenImageIds.has(image.id) ? imageMap[image.id] : undefined;
  const imageType = image ? getImageMimeType(image.name) : undefined;

  // Track playing time since Chrome has a bug where it doesn't allways
  // fire the progress event
  useEffect(() => {
    const player = audioRef.current;
    if (!player || audioState !== "playing") return;

    const interval = setInterval(() => {
      setPosition(player.currentTime * 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [audioState, setPosition]);

  // Handle seek changes from controls
  useEffect(() => {
    if (track && seekTo >= 0) {
      const player = audioRef.current;

      if (player) {
        player.currentTime = seekTo / 1000;
      }

      setPosition(seekTo);
      setSeekTo(-1);
    }
  }, [seekTo]);

  // The lock screen calls these after the effect below set them, so they read
  // the latest state when they run
  const handleMediaNext = useEffectEvent(() => onNext());
  const handleMediaPause = useEffectEvent(() => onPause());
  const handleMediaPlay = useEffectEvent(() => onResume());
  const handleMediaPrevious = useEffectEvent(() => onPrevious());
  const handleMediaSeekBy = useEffectEvent((offsetMs: number) =>
    onSeekBy(offsetMs)
  );
  const handleMediaSeekTo = useEffectEvent((positionMs: number) =>
    onSeekTo(positionMs)
  );

  // Sets the lock screen's actions once, instead of on every render
  useEffect(() => {
    setMediaHandlers({
      onNext: () => handleMediaNext(),
      onPause: () => handleMediaPause(),
      onPlay: () => handleMediaPlay(),
      onPrevious: () => handleMediaPrevious(),
      onSeekBy: (offsetMs) => handleMediaSeekBy(offsetMs),
      onSeekTo: (positionMs) => handleMediaSeekTo(positionMs),
    });
  }, []);

  // Tells the lock screen where playback is. The browser moves the lock
  // screen's clock on its own while playing, so this is needed only when
  // playback starts, pauses, or jumps, and when the track's length changes.
  const syncMediaPosition = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    setMediaPosition({
      durationMs: el.duration * 1000,
      positionMs: el.currentTime * 1000,
    });
  }, []);

  const handleDurationChange = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    const duration = el.duration;

    // Will save the duration in the playlist if needed
    onSetTrackDuration(duration);
    syncMediaPosition();
    setAudioDuration(duration * 1000);
  }, [onSetTrackDuration, setAudioDuration, syncMediaPosition]);

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

  // Playback really started, so the track can get a fresh link again if it
  // fails later (for example, its link expires during a long pause)
  const handlePlaybackStarted = useCallback(() => {
    retriedTrackIdRef.current = undefined;
    syncMediaPosition();
  }, [syncMediaPosition]);

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
        // Without artwork, setMediaTrack uses the app icons. The image's size
        // is not known, so `sizes` is left out rather than guessed, and so
        // is `type` when the extension is not a known image type.
        artwork: imagePath
          ? [{ src: imagePath, ...(imageType && { type: imageType }) }]
          : undefined,
      });
    }
  }, [track?.id, imagePath, imageType, playlist?.meta?.id]);

  // Records why the playing track failed, then moves to the next track or
  // stops. Errors about the file are saved in the shared playlist. Transient
  // errors (connection, rate limit, server) are shown for this session only.
  function failTrack({ errorCode, isTransient, message }: TrackFailure) {
    if (isTransient) {
      onSetSessionTrackError(message);
    } else {
      onSetTrackError(message, errorCode);
    }

    if (hasNext) {
      onNext();
    } else {
      setAudioState("stopped");
    }
  }

  // Called when a load finishes. They read the latest state when they run,
  // so they are not dependencies of the effect below and do not restart it.
  const handleTrackLoaded = useEffectEvent((meta: FileMeta) => {
    // If this track previously had an error we need to clear it
    // or if it was updated or moved on the server
    onUpdateTrackMeta(meta);
  });

  const handleTrackFailed = useEffectEvent((error: unknown) => {
    logError(error as Error);
    failTrack({
      message: getTrackErrorMessage(error),
      // The file is gone at its path and its id, so offer to replace it
      errorCode: isPathNotFoundError(error) ? "not_found" : undefined,
      isTransient: isTransientError(error),
    });
  });

  // The audio element could not load or play its source
  function handleMediaError() {
    const player = audioRef.current;
    const code = player?.error?.code;

    // Aborted means we changed the source ourselves. A source that belongs
    // to another track is an old load that no longer matters.
    if (
      !player ||
      !track ||
      !code ||
      code === MEDIA_ERROR.aborted ||
      loadedTrackIdRef.current !== track.id
    ) {
      return;
    }

    if (retriedTrackIdRef.current !== track.id) {
      // First error: the link may have expired (they last about 4 hours), so
      // get a fresh one and pick up where playback stopped
      retriedTrackIdRef.current = track.id;
      resumeAtRef.current = player.currentTime;
      setReloadCount((count) => count + 1);
      setAudioState("loading");
      return;
    }

    logError(new Error(`Audio element error ${code}`));
    failTrack({
      message: getMediaErrorMessage(code),
      isTransient: code === MEDIA_ERROR.network,
    });
  }

  const handlePlayRejected = useEffectEvent((error: unknown) => {
    const name = error instanceof DOMException ? error.name : "";

    if (name === "AbortError") {
      // A newer load or a pause replaced this play request, which is expected
      return;
    }

    if (name === "NotAllowedError") {
      // The browser blocks playback the user did not start, such as the next
      // track in a background tab. Show the play button so they can start it.
      setAudioState("paused");
      return;
    }

    // Problems with the file itself also fire the audio element's error
    // event, which reports them, so only log here to avoid reporting twice
    logError(error as Error);
  });

  // Updates playing track when changes
  useEffect(() => {
    // Set when the effect runs again, so a late result from this run is
    // ignored. Otherwise a stale load could still set the source or an error.
    let isStale = false;

    // play() returns a promise that rejects when playback cannot start
    function startPlayback(player: HTMLAudioElement) {
      player.play().catch((error: unknown) => {
        if (!isStale) handlePlayRejected(error);
      });
      setMediaState("playing");
    }

    async function updatePlayer() {
      const player = audioRef.current;

      if (!player || !isAuthenticated) return;

      if (track && track.path_lower && audioState === "loading") {
        // This is not a resume so we need to load the file
        try {
          const fileLink = await getTrackLink(dbx, track);
          if (isStale) return;

          player.setAttribute("src", fileLink.link);
          // Loading a renamed file switches the playing track to the new id
          loadedTrackIdRef.current = fileLink.metadata.id;

          if (resumeAtRef.current !== undefined) {
            // Reloaded after an error, so continue from the same spot
            player.currentTime = resumeAtRef.current;
            resumeAtRef.current = undefined;
          }

          startPlayback(player);

          handleTrackLoaded(fileLink.metadata as FileMeta);
        } catch (error) {
          if (isStale) return;
          handleTrackFailed(error);
          return;
        }
      } else if (track && audioState === "playing") {
        if (loadedTrackIdRef.current !== track.id) {
          // The source is another track's, because this track's load was
          // cancelled (for example, paused while loading), so load it now
          setAudioState("loading");
          return;
        }
        startPlayback(player);
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

    return () => {
      isStale = true;
    };
  }, [
    audioState,
    dbx,
    isAuthenticated,
    playlist?.meta?.id,
    reloadCount,
    track?.id,
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
      onError={handleMediaError}
      onPause={syncMediaPosition}
      onPlay={handlePlaying}
      onPlaying={handlePlaybackStarted}
      onProgress={handleProgress}
      onSeeked={syncMediaPosition}
      ref={audioRef}
    />
  );
}
