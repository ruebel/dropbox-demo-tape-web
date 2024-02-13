"use client";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { TextInput } from "@/components/TextInput/TextInput";
import { DEMO_FILE_EXT, HOME } from "@/utils/constants";
import { useState } from "react";

import { uploadFile } from "@/api/file";
import { Explorer } from "@/components/Explorer/Explorer";
import { dbxAtom } from "@/state/dropbox";
import { playlistsAtom } from "@/state/playlists";
import { Playlist, PlaylistData } from "@/utils/types";
import { playlistUrl } from "@/utils/url";
import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import styles from "./addPlaylist.module.css";

export function AddPlaylist() {
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("/");
  const dbx = useAtomValue(dbxAtom);
  const [playlists, savePlaylistLocally] = useAtom(playlistsAtom);
  const { push } = useRouter();

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();

    const filePath = `${path}/${title}.${DEMO_FILE_EXT}`;
    const playlistData = {
      artist,
      title,
      tracks: [],
    } as PlaylistData;

    // Save the file to dropbox
    const meta = await uploadFile(dbx, playlistData, filePath);

    // Create entire playlist shape
    const playlist = { data: playlistData, meta } as Playlist;

    // save playlist locally
    savePlaylistLocally([...playlists, playlist]);

    // Redirect the user to the playlist page
    push(playlistUrl(meta.id));

    return false;
  }

  return (
    <form className={styles.wrapper} onSubmit={handleSave}>
      <div className={styles.header}>
        <h2>New Playlist</h2>
        <ButtonLink type="submit">Save</ButtonLink>
        <ButtonLink href={HOME}>Cancel</ButtonLink>
      </div>
      <TextInput onChange={setTitle} title="Title" value={title} />
      <TextInput onChange={setArtist} title="Artist" value={artist} />
      <div className={styles.explorerWrapper}>
        <div className={styles.explorerInner}>
          <Explorer onPathChange={setPath} />
        </div>
        <div className={styles.explorerTitle}>Location</div>
      </div>
    </form>
  );
}
