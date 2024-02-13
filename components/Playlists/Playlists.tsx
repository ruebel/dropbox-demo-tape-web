import { ButtonLink } from "@/components/ButtonLink/ButtonLink";
import { loadableDBPlaylists, playlistsAtom } from "@/state/playlists";
import { formatRelative } from "date-fns/formatRelative";
import { useAtomValue } from "jotai";

import { List } from "@/components/List/List";
import { PlaylistImage } from "@/components/PlaylistImage/PlaylistImage";
import { Progress } from "@/components/Progress/Progress";
import { usersAtom } from "@/state/users";
import { playlistUrl } from "@/utils/url";
import Link from "next/link";
import styles from "./playlists.module.css";

export function Playlists() {
  const playlists = useAtomValue(playlistsAtom);
  const dbLoading = useAtomValue(loadableDBPlaylists);
  const users = useAtomValue(usersAtom);

  const showLoading = dbLoading.state === "loading" && !playlists.length;

  return (
    <div className={styles.root}>
      {showLoading && <Progress />}
      <div className={styles.actions}>
        <ButtonLink href="/playlist/new">Add</ButtonLink>
      </div>
      <List
        getKey={(playlist) => playlist.meta.id}
        items={playlists}
        itemRenderer={(playlist) => {
          const user = users?.[playlist.meta.modifiedBy];

          return (
            <Link href={playlistUrl(playlist.meta.id)}>
              <div className={styles.playlist}>
                <PlaylistImage playlist={playlist} size={50} />
                <div className={styles.title}>
                  <h3>{playlist.data.title}</h3>
                  <span className={styles.path}>
                    {playlist.data.artist || playlist.meta.path_display}
                  </span>
                </div>
                <div className={styles.updated}>
                  <div>
                    Updated{" "}
                    {formatRelative(
                      new Date(playlist.meta.server_modified),
                      new Date()
                    )}
                  </div>
                  {user && (
                    <div className={styles.modified}>
                      by {user.name.display_name}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        }}
      />
    </div>
  );
}
