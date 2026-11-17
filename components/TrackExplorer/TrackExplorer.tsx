"use client";

import { playlistAtom, updatePlaylistAtom } from "@/state/playlists";
import { mergeEditedTracks } from "@/utils/playlist";
import { EnhancedFileMeta } from "@/utils/types";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { Explorer } from "@/components/Explorer/Explorer";
import { PlaylistHeader } from "@/components/PlaylistHeader/PlaylistHeader";
import { getPathWithoutFileName } from "@/utils/file";
import { playlistUrl } from "@/utils/url";
import { useRouter } from "next/navigation";
import styles from "./trackExplorer.module.css";

type TrackExplorerProps = {
  id: string;
};

export function TrackExplorer({ id }: TrackExplorerProps) {
  const playlist = useAtomValue(playlistAtom(id));
  const updatePlaylist = useSetAtom(updatePlaylistAtom);
  const [selectedTracks, setSelectedTracks] = useState(
    playlist?.data.tracks || []
  );
  const [isDirty, setIsDirty] = useState(false);
  const { push } = useRouter();

  async function handleSave() {
    if (!playlist) return;

    // Applies only the track selection to the latest saved playlist, so
    // changes the player saved while the page was open are kept
    await updatePlaylist({
      playlistId: id,
      update: (latest) => ({
        ...latest,
        data: {
          ...latest.data,
          tracks: mergeEditedTracks(latest.data.tracks, selectedTracks),
        },
      }),
    });

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
        initialFolder={getPathWithoutFileName(playlist.meta.path)}
        onSelectionChange={handleSelectionChange}
        selectedEntries={selectedTracks}
        showFiles={true}
      />
    </div>
  );
}
