"use client";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { TextInput } from "@/components/TextInput/TextInput";
import {
  artistsAtom,
  playlistAtom,
  updatePlaylistAtom,
} from "@/state/playlists";
import { sortTracksByPath } from "@/utils/folderSync";
import { mergeEditedOrder, mergeEditedTracks } from "@/utils/playlist";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";

import { EditableTrackList } from "@/components/EditPlaylist/EditableTrackList";
import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { Typeahead } from "@/components/Typeahead/Typeahead";
import { FolderSort, PlaylistData, PlaylistTrack } from "@/utils/types";
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
  const playlist = useAtomValue(playlistAtom(id));
  const updatePlaylist = useSetAtom(updatePlaylistAtom);
  const [isDirty, setIsDirty] = useState(false);
  const [artist, setArtist] = useState(playlist?.data.artist || "");
  const [title, setTitle] = useState(playlist?.data.title || "");
  const [tracks, setTracks] = useState(playlist?.data.tracks || []);
  const folder = playlist?.data.folder;
  const [sort, setSort] = useState<FolderSort>(folder?.sort ?? "name");
  const artists = useAtomValue(artistsAtom);

  const { push } = useRouter();

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
    setSort("custom");
    setIsDirty(true);
  }

  function handleSortByName() {
    setTracks(sortTracksByPath(tracks));
    setSort("name");
    setIsDirty(true);
  }

  // Only this page's track edits, applied to the latest saved data
  function mergeTracks(latest: PlaylistData): Partial<PlaylistData> {
    if (!latest.folder) {
      return { tracks: mergeEditedTracks(latest.tracks, tracks) };
    }

    // A sync can add or remove files while the page is open, so the latest
    // tracks decide which tracks are in the playlist
    return {
      folder: { ...latest.folder, sort },
      tracks:
        sort === "name"
          ? sortTracksByPath(latest.tracks)
          : mergeEditedOrder(latest.tracks, tracks),
    };
  }

  async function handleSave() {
    if (!playlist) return;

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
          <ButtonLink disabled={!isDirty} onClick={handleSave}>
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
      <div className={styles.tracksHeader}>
        <h2>Tracks</h2>
        {folder ? (
          <ButtonLink disabled={sort === "name"} onClick={handleSortByName}>
            Sort A–Z
          </ButtonLink>
        ) : (
          <ButtonLink href={editPlaylistTracksUrl(id)}>Edit Tracks</ButtonLink>
        )}
      </div>
      {folder && (
        <p className={styles.folderPath}>
          Every audio file in <strong>{folder.path}</strong> is in this
          playlist. Drag tracks to change their order.
        </p>
      )}
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
