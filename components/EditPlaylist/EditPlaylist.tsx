"use client";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { TextInput } from "@/components/TextInput/TextInput";
import { artistsAtom, playlistAtom } from "@/state/playlists";
import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";

import { EditableTrackList } from "@/components/EditPlaylist/EditableTrackList";
import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { Typeahead } from "@/components/Typeahead/Typeahead";
import { Playlist, PlaylistTrack } from "@/utils/types";
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
  const [playlist, savePlaylist] = useAtom(playlistAtom(id));
  const [isDirty, setIsDirty] = useState(false);
  const [artist, setArtist] = useState(playlist?.data.artist || "");
  const [title, setTitle] = useState(playlist?.data.title || "");
  const [tracks, setTracks] = useState(playlist?.data.tracks || []);
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
    setIsDirty(true);
  }

  async function handleSave() {
    if (!playlist) return;

    await savePlaylist({
      ...playlist,
      data: {
        ...playlist.data,
        artist,
        title,
        tracks,
      },
    } as Playlist);

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
        <ButtonLink href={editPlaylistTracksUrl(id)}>Edit Tracks</ButtonLink>
      </div>
      {tracks.length === 0 && (
        <a className={styles.emptyTracks} href={editPlaylistTracksUrl(id)}>
          Add tracks to your playlist
        </a>
      )}
      <EditableTrackList onTrackChange={handleTrackChange} tracks={tracks} />
    </div>
  );
}
