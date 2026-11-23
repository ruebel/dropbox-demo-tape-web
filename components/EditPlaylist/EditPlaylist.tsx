"use client";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { TextInput } from "@/components/TextInput/TextInput";
import { artistsAtom, updatePlaylistAtom } from "@/state/playlists";
import { reconcileFolderTracks, sortTracksByPath } from "@/utils/folderSync";
import { mergeEditedOrder, mergeEditedTracks } from "@/utils/playlist";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useState } from "react";

import { listFolderAudioFiles } from "@/api/folder";
import { EditableTrackList } from "@/components/EditPlaylist/EditableTrackList";
import { LoadedPlaylist } from "@/components/LoadedPlaylist/LoadedPlaylist";
import { PathText } from "@/components/PathText/PathText";
import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { Progress } from "@/components/Progress/Progress";
import { getFolderSyncErrorMessage } from "@/hooks/useFolderSync";
import { dbxAtom } from "@/state/dropbox";
import { Typeahead } from "@/components/Typeahead/Typeahead";
import {
  FolderSort,
  Playlist,
  PlaylistData,
  PlaylistTrack,
} from "@/utils/types";
import {
  editPlaylistImageUrl,
  editPlaylistTracksUrl,
  playlistUrl,
} from "@/utils/url";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./editPlaylist.module.css";

type EditPlaylistProps = {
  id: string;
};

export function EditPlaylist({ id }: EditPlaylistProps) {
  return (
    <LoadedPlaylist id={id}>
      {(playlist) => <EditPlaylistForm id={id} playlist={playlist} />}
    </LoadedPlaylist>
  );
}

type EditPlaylistFormProps = {
  id: string;
  // The latest playlist. The form's fields start from its first value.
  playlist: Playlist;
};

function EditPlaylistForm({ id, playlist }: EditPlaylistFormProps) {
  const updatePlaylist = useSetAtom(updatePlaylistAtom);
  const [isDirty, setIsDirty] = useState(false);
  const [artist, setArtist] = useState(playlist.data.artist);
  const [title, setTitle] = useState(playlist.data.title);
  const [tracks, setTracks] = useState(playlist.data.tracks);
  const folder = playlist.data.folder;
  const [sort, setSort] = useState<FolderSort>(folder?.sort ?? "name");
  // The sort for a folder listing to use when it finishes. A drag during the
  // listing changes it.
  const sortRef = useRef(sort);
  const [includeSubfolders, setIncludeSubfolders] = useState(
    !!folder?.includeSubfolders
  );
  // True while the folder is listed for a new includeSubfolders value
  const [isListing, setIsListing] = useState(false);
  // The error from the last listing, cleared when the next one starts
  const [listError, setListError] = useState<unknown>(null);
  const artists = useAtomValue(artistsAtom);
  const dbx = useAtomValue(dbxAtom);

  const { push } = useRouter();

  function changeSort(newSort: FolderSort) {
    setSort(newSort);
    sortRef.current = newSort;
  }

  function handleArtistChange(newArtist: string) {
    setArtist(newArtist);
    setIsDirty(true);
  }

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    setIsDirty(true);
  }

  function handleTrackChange(newTracks: PlaylistTrack[]) {
    setTracks(newTracks);
    // For a folder playlist, the only track change is a drag
    changeSort("custom");
    setIsDirty(true);
  }

  // Lists the folder with the new value, so the track list shows the tracks
  // the playlist will have. The checkbox is disabled until the listing
  // finishes, so listings cannot finish out of order.
  async function handleIncludeSubfoldersChange(checked: boolean) {
    if (!folder) return;

    setIncludeSubfolders(checked);
    setListError(null);
    setIsListing(true);
    try {
      const { files } = await listFolderAudioFiles(dbx, folder.id, {
        recursive: checked,
      });
      // Matches against the tracks on the page when the listing finishes, so
      // a drag during the listing is kept
      setTracks(
        (current) =>
          reconcileFolderTracks(current, files, sortRef.current) ?? current
      );
      setIsDirty(true);
    } catch (error) {
      setIncludeSubfolders(!checked);
      setListError(error);
    } finally {
      setIsListing(false);
    }
  }

  function handleSortByName() {
    setTracks(sortTracksByPath(tracks));
    changeSort("name");
    setIsDirty(true);
  }

  // Only this page's track edits, applied to the latest saved data
  function mergeTracks(latest: PlaylistData): Partial<PlaylistData> {
    if (!latest.folder) {
      return { tracks: mergeEditedTracks(latest.tracks, tracks) };
    }

    const nextFolder = { ...latest.folder, includeSubfolders, sort };

    // After a change to includeSubfolders, the page's tracks come from a new
    // listing, so they decide which tracks are in the playlist. The latest
    // saved tracks still decide each track's details. The next sync fixes
    // any file that changed since the listing.
    if (!!latest.folder.includeSubfolders !== includeSubfolders) {
      const merged = mergeEditedTracks(latest.tracks, tracks);
      return {
        folder: nextFolder,
        tracks: sort === "name" ? sortTracksByPath(merged) : merged,
      };
    }

    // A sync can add or remove files while the page is open, so the latest
    // tracks decide which tracks are in the playlist
    return {
      folder: nextFolder,
      tracks:
        sort === "name"
          ? sortTracksByPath(latest.tracks)
          : mergeEditedOrder(latest.tracks, tracks),
    };
  }

  async function handleSave() {
    // Applies only this page's edits to the latest saved playlist, so changes
    // the player saved while the page was open are kept
    await updatePlaylist({
      playlistId: id,
      update: (latest) => ({
        ...latest,
        data: {
          ...latest.data,
          artist,
          title,
          ...mergeTracks(latest.data),
        },
      }),
    });

    push(playlistUrl(id));
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2>Edit playlist</h2>
        <div className={styles.actions}>
          <ButtonLink disabled={!isDirty || isListing} onClick={handleSave}>
            Save
          </ButtonLink>
          <ButtonLink href={playlistUrl(id)}>Cancel</ButtonLink>
        </div>
      </div>
      <div className={styles.inputWrapper}>
        <div className={styles.imageEditWrapper}>
          <Link className={styles.imageEdit} href={editPlaylistImageUrl(id)}>
            <PlaylistImage playlist={playlist} size={106} />
            <div className={styles.imageEditHover}>
              <div>Edit Image</div>
            </div>
          </Link>
        </div>
        <div className={styles.input}>
          <TextInput onChange={handleTitleChange} title="Title" value={title} />
          <Typeahead
            onChange={handleArtistChange}
            options={artists}
            title="Artist"
            value={artist}
          />
        </div>
      </div>
      <div className={styles.tracksSection}>
        <div className={styles.tracksHeader}>
          <h2>Tracks</h2>
          {folder ? (
            <ButtonLink
              disabled={sort === "name" || isListing}
              onClick={handleSortByName}
              size="small"
            >
              Sort A–Z
            </ButtonLink>
          ) : (
            <ButtonLink href={editPlaylistTracksUrl(id)} size="small">
              Edit Tracks
            </ButtonLink>
          )}
        </div>
        {folder && (
          <>
            <div className={styles.folderRow}>
              <p className={styles.folderPath}>
                Synced with{" "}
                <strong>
                  <PathText text={folder.path} />
                </strong>
              </p>
              <Checkbox
                checked={includeSubfolders}
                disabled={isListing}
                label="Include subfolders"
                onChange={handleIncludeSubfoldersChange}
              />
            </div>
            <p className={styles.dragHint}>Drag tracks to change their order.</p>
            {listError !== null && (
              <div className={styles.listError} role="alert">
                {getFolderSyncErrorMessage(listError)}
              </div>
            )}
          </>
        )}
      </div>
      {isListing && <Progress />}
      {tracks.length === 0 && !folder && (
        <a className={styles.emptyTracks} href={editPlaylistTracksUrl(id)}>
          Add tracks to your playlist
        </a>
      )}
      <EditableTrackList
        canDelete={!folder}
        onTrackChange={handleTrackChange}
        tracks={tracks}
      />
    </div>
  );
}
