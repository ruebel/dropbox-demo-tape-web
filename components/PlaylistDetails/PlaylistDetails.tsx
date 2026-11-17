import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { ConfirmationButton } from "@/components/ConfirmationButton/ConfirmationButton";
import { List } from "@/components/List/List";
import { PlaylistHeader } from "@/components/PlaylistHeader/PlaylistHeader";
import { Progress } from "@/components/Progress/Progress";
import { ReplaceTrack } from "@/components/ReplaceTrack/ReplaceTrack";
import { Track } from "@/components/Track/Track";
import { useAudio } from "@/hooks/useAudio";
import { useDeletePlaylist } from "@/hooks/useDeletePlaylist";
import { playlistAtom } from "@/state/playlists";
import { HOME } from "@/utils/constants";
import { Playlist } from "@/utils/types";
import { editPlaylistUrl } from "@/utils/url";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import styles from "./playlistDetails.module.css";

type PlaylistDetailsProps = {
  id: string;
};

export function PlaylistDetails({ id }: PlaylistDetailsProps) {
  const playlist = useAtomValue(playlistAtom(id));
  const { audioState, onPause, onPlay, track } = useAudio();
  const { isLoading, onDeletePlaylist } = useDeletePlaylist();
  const { push } = useRouter();

  if (!playlist) return null;

  async function handleDelete() {
    await onDeletePlaylist(playlist as Playlist);
    push(HOME);
  }

  function handleTrackClick(id: string) {
    if (!playlist) return;

    if (audioState === "playing" && id === track?.id) {
      onPause();
    } else {
      onPlay(playlist?.meta?.id || "", id);
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <PlaylistHeader playlist={playlist} />
        <div className={styles.actions}>
          <ButtonLink href={editPlaylistUrl(id)}>Edit</ButtonLink>
          <ConfirmationButton message="Really Delete?" onClick={handleDelete}>
            Delete
          </ConfirmationButton>
        </div>
      </div>
      {playlist.data.tracks.length === 0 && (
        <a href={editPlaylistUrl(id)}>
          <div className={styles.empty}>Add Tracks</div>
        </a>
      )}
      {isLoading && <Progress />}
      <List
        getKey={(t) => t.id}
        items={playlist.data.tracks}
        itemRenderer={(track, index) => {
          // The replace row under a missing track shows its error message
          const isMissing = track.errorCode === "not_found";
          const row = (
            <Track
              index={index + 1}
              onClick={handleTrackClick}
              showErrorTooltip={!isMissing}
              track={track}
            />
          );

          return isMissing ? (
            <div className={styles.missingTrack}>
              {row}
              <ReplaceTrack playlist={playlist} track={track} />
            </div>
          ) : (
            row
          );
        }}
      />
    </div>
  );
}
