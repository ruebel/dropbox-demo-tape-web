import { dbxAtom, isAuthenticatedAtom } from "@/state/dropbox";
import { imageMapAtom } from "@/state/image";
import { Playlist } from "@/utils/types";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";

type PlaylistImageProps = {
  playlist: Playlist | null;
  size?: number | string;
};

type ImageState = "none" | "fetched" | "error";

export function PlaylistImage({ playlist, size = 50 }: PlaylistImageProps) {
  const [url, setUrl] = useState("");
  const [imageState, setImageState] = useState<ImageState>("none");
  const dbx = useAtomValue(dbxAtom);
  const imageId = playlist?.data?.image?.id;
  const [imageMap, setImageMap] = useAtom(imageMapAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  useEffect(() => {
    async function getImageUrl() {
      if (playlist?.data?.image?.path_lower) {
        const fileLink = await dbx.filesGetTemporaryLink({
          path: playlist.data.image.path_lower,
        });

        setUrl(fileLink?.result?.link);

        setImageMap({
          ...imageMap,
          [playlist?.data?.image?.id]: fileLink?.result?.link,
        });
        setImageState("fetched");
      } else {
        setUrl("");
        setImageState("error");
      }
    }

    const mappedImage = imageId ? imageMap[imageId] : undefined;

    if (imageState !== "error" && mappedImage) {
      setUrl(mappedImage);
    } else {
      getImageUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId, imageState, playlist?.meta?.id, isAuthenticated]);

  function handleError() {
    if (url && imageState !== "fetched") {
      // we didn't fetch the image and there's an error
      // so force the fetch again
      setImageState("error");
    }
  }

  return (
    <img
      alt={playlist?.data?.title}
      height={size === "100%" ? "auto" : size}
      onError={handleError}
      src={url || `/android-icon-96x96.png`}
      width={size}
    />
  );
}
