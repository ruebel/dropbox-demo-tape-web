import { logError } from "@/hooks/useErrorTracking";
import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import { imageMapAtom } from "@/state/image";
import { Playlist } from "@/utils/types";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import styles from "./playlistImage.module.css";

const FALLBACK_IMAGE = "/android-icon-96x96.png";

type PlaylistImageProps = {
  playlist: Playlist | null;
  size?: number | string;
};

type ImageState = "none" | "fetched" | "error";

export function PlaylistImage({ playlist, size = 50 }: PlaylistImageProps) {
  const [url, setUrl] = useState("");
  const [failedUrl, setFailedUrl] = useState("");
  const [imageState, setImageState] = useState<ImageState>("none");
  const dbx = useAtomValue(dbxAtom);
  const imageId = playlist?.data?.image?.id;
  const [imageMap, setImageMap] = useAtom(imageMapAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const mappedImage = imageId ? imageMap[imageId] : undefined;
  const imageUrl = imageState !== "error" && mappedImage ? mappedImage : url;
  const showFallback = !imageUrl || imageUrl === failedUrl;

  useEffect(() => {
    async function getImageUrl() {
      if (playlist?.data?.image?.path_lower) {
        try {
          const fileLink = await dbx.filesGetTemporaryLink({
            path: playlist.data.image.path_lower,
          });

          setUrl(fileLink?.result?.link);

          setImageMap({
            ...imageMap,
            [playlist?.data?.image?.id]: fileLink?.result?.link,
          });
          setImageState("fetched");
        } catch (error) {
          // The Dropbox client has no token until sign-in finishes,
          // so only log failures after sign-in
          if (isAuthenticated) {
            logError(error as Error);
          }
          setUrl("");
        }
      } else {
        setUrl("");
        setImageState("error");
      }
    }

    if (imageState === "error" || !mappedImage) {
      getImageUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId, imageState, playlist?.meta?.id, isAuthenticated]);

  function handleError() {
    if (showFallback) {
      return;
    }
    if (imageUrl === url) {
      // A freshly fetched link failed, so stop retrying and show the fallback
      setFailedUrl(url);
    } else {
      // A cached link failed (likely expired), so fetch a fresh one
      setImageState("error");
    }
  }

  return (
    <img
      alt={playlist?.data?.title}
      className={styles.image}
      height={size === "100%" ? "auto" : size}
      onError={handleError}
      src={showFallback ? FALLBACK_IMAGE : imageUrl}
      width={size}
    />
  );
}
