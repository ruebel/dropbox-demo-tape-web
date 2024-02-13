"use client";

import { playlistAtom } from "@/state/playlists";
import { EnhancedFileMeta, Playlist } from "@/utils/types";
import { useAtom } from "jotai";
import { useState } from "react";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { Explorer } from "@/components/Explorer/Explorer";
import { PlaylistHeader } from "@/components/PlaylistHeader/PlaylistHeader";
import { playlistUrl } from "@/utils/url";
import { useRouter } from "next/navigation";
import styles from "./trackExplorer.module.css";

type TrackExplorerProps = {
  id: string;
};

export function TrackExplorer({ id }: TrackExplorerProps) {
  const [playlist, savePlaylist] = useAtom(playlistAtom(id));
  const [selectedTracks, setSelectedTracks] = useState(
    playlist?.data.tracks || []
  );
  const [isDirty, setIsDirty] = useState(false);
  const { push } = useRouter();

  async function handleSave() {
    if (!playlist) return;

    await savePlaylist({
      ...playlist,
      data: {
        ...playlist.data,
        tracks: selectedTracks,
      },
    } as Playlist);

    push(playlistUrl(id));
  }

  function handleSelectionChange(tracks: EnhancedFileMeta[]) {
    setSelectedTracks(tracks);
    if (!isDirty) {
      setIsDirty(true);
    }
  }

  if (!playlist) return null;

  return (
    <div>
      <div className={styles.header}>
        <PlaylistHeader playlist={playlist} />
        <div className={styles.actions}>
          <ButtonLink disabled={!isDirty} onClick={handleSave}>
            Save
          </ButtonLink>
          <ButtonLink href={playlistUrl(id)}>Cancel</ButtonLink>
        </div>
      </div>
      <Explorer
        onSelectionChange={handleSelectionChange}
        selectedEntries={selectedTracks}
        showFiles={true}
      />
    </div>
  );
}
