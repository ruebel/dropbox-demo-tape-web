import { findFilesByName } from "@/api/track";
import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { ConfirmationButton } from "@/components/ConfirmationButton/ConfirmationButton";
import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom } from "@/state/dropbox";
import { updatePlaylistAtom, updatePlaylistTrackAtom } from "@/state/playlists";
import {
  getPathWithoutFileName,
  removeExtension,
  transformFile,
} from "@/utils/file";
import { styleArray } from "@/utils/style";
import { FileMeta, Playlist, PlaylistTrack } from "@/utils/types";
import { formatRelative } from "date-fns/formatRelative";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import styles from "./replaceTrack.module.css";

type ReplaceTrackProps = {
  playlist: Playlist;
  track: PlaylistTrack;
};

type Status =
  | "idle"
  | "searching"
  | "searched"
  | "searchFailed"
  | "saving"
  | "saveFailed";

/**
 * Shown under a track whose file is gone. Searches Dropbox for a file with
 * the same name to use instead, or removes the track from the playlist.
 */
export function ReplaceTrack({ playlist, track }: ReplaceTrackProps) {
  const dbx = useAtomValue(dbxAtom);
  const updatePlaylist = useSetAtom(updatePlaylistAtom);
  const updatePlaylistTrack = useSetAtom(updatePlaylistTrackAtom);
  const [status, setStatus] = useState<Status>("idle");
  const [matches, setMatches] = useState<FileMeta[]>([]);

  // People who share the playlist can open files in its shared folder
  const sharedFolderId = playlist.meta.sharing_info?.parent_shared_folder_id;

  async function handleSearch() {
    setStatus("searching");
    try {
      setMatches(await findFilesByName(dbx, track.name, sharedFolderId));
      setStatus("searched");
    } catch (error) {
      logError(error as Error);
      setStatus("searchFailed");
    }
  }

  async function save(change: Promise<void>) {
    setStatus("saving");
    try {
      // On success the track changes or goes away, which unmounts this row
      await change;
    } catch (error) {
      logError(error as Error);
      setStatus("saveFailed");
    }
  }

  function handleReplace(file: FileMeta) {
    save(
      updatePlaylistTrack({
        playlistId: playlist.meta.id,
        trackId: track.id,
        // A new entry, so the old duration and error do not carry over
        update: () => transformFile({ ...file, ".tag": "file" }),
      })
    );
  }

  function handleRemove() {
    save(
      updatePlaylist({
        playlistId: playlist.meta.id,
        update: (p) => ({
          ...p,
          data: {
            ...p.data,
            tracks: p.data.tracks.filter((t) => t.id !== track.id),
          },
        }),
      })
    );
  }

  const isBusy = status === "searching" || status === "saving";

  return (
    <div
      aria-label={`Replace ${removeExtension(track.name)}`}
      className={styles.root}
      role="group"
    >
      {status === "searched" && matches.length > 0 && (
        <ul className={styles.matches}>
          {matches.map((file) => (
            <li className={styles.match} key={file.id}>
              <div className={styles.matchInfo}>
                <span className={styles.folder}>
                  {getPathWithoutFileName(file.path_display || "") || "/"}
                </span>
                <span className={styles.details}>
                  Updated{" "}
                  {formatRelative(new Date(file.server_modified), new Date())}
                  {sharedFolderId &&
                    file.sharing_info?.parent_shared_folder_id !==
                      sharedFolderId && (
                      <span className={styles.private}>
                        {" "}
                        • Only you can access this file
                      </span>
                    )}
                </span>
              </div>
              <ButtonLink onClick={() => handleReplace(file)} size="small">
                Use this file
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.footer}>
        <span
          className={styleArray([
            styles.message,
            status === "idle" && styles.error,
          ])}
          role="status"
        >
          {/* Shown here in place of the track's error tooltip */}
          {status === "idle" && track.error}
          {status === "searching" && "Searching Dropbox…"}
          {status === "saving" && "Saving…"}
          {status === "searchFailed" && "Couldn't search Dropbox."}
          {status === "saveFailed" && "Couldn't save the playlist."}
          {status === "searched" &&
            matches.length === 0 &&
            "No matching file found in Dropbox"}
        </span>
        <div className={styles.actions}>
          {(status === "idle" || status === "searchFailed") && (
            <ButtonLink onClick={handleSearch} size="small">
              {status === "idle" ? "Find file" : "Try again"}
            </ButtonLink>
          )}
          {!isBusy && (
            <ConfirmationButton
              message="Really remove?"
              onClick={handleRemove}
              size="small"
            >
              Remove track
            </ConfirmationButton>
          )}
        </div>
      </div>
    </div>
  );
}
