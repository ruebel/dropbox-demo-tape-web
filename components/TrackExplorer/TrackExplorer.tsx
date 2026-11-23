"use client";

import { updatePlaylistAtom } from "@/state/playlists";
import { mergeEditedTracks } from "@/utils/playlist";
import { EnhancedFileMeta, Playlist } from "@/utils/types";
import { useSetAtom } from "jotai";
import { useState } from "react";

import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { Explorer } from "@/components/Explorer/Explorer";
import { LoadedPlaylist } from "@/components/LoadedPlaylist/LoadedPlaylist";
import { PlaylistHeader } from "@/components/PlaylistHeader/PlaylistHeader";
import { getPathWithoutFileName } from "@/utils/file";
import { playlistUrl } from "@/utils/url";
import { useRouter } from "next/navigation";
import styles from "./trackExplorer.module.css";

type TrackExplorerProps = {
  id: string;
};

export function TrackExplorer({ id }: TrackExplorerProps) {
  return (
    <LoadedPlaylist id={id}>
      {(playlist) => <TrackPicker id={id} playlist={playlist} />}
    </LoadedPlaylist>
  );
}

type TrackPickerProps = {
  id: string;
  // The latest playlist. The selection starts from its first value.
  playlist: Playlist;
};

function TrackPicker({ id, playlist }: TrackPickerProps) {
  const updatePlaylist = useSetAtom(updatePlaylistAtom);
  const [selectedTracks, setSelectedTracks] = useState(playlist.data.tracks);
  const [isDirty, setIsDirty] = useState(false);
  const { push } = useRouter();

  async function handleSave() {
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
