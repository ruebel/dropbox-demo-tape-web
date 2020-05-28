import React, { useEffect, useState } from "react";
import { useDropbox } from "./dropboxContext";
import useLocalStorage from "./useLocalStorage";

function PlaylistImage({ playlist, size = 50 }) {
  const [url, setUrl] = useState();
  const { dbx } = useDropbox();
  const [imageMap = {}, setImageMap] = useLocalStorage("playlistImages");
  const imageId = playlist?.data?.image?.id;

  useEffect(() => {
    async function getImageUrl() {
      if (playlist?.data?.image) {
        const fileLink = await dbx.filesGetTemporaryLink({
          path: playlist.data.image?.path_lower,
        });
        setUrl(fileLink?.link);
        setImageMap({
          ...imageMap,
          [playlist?.data?.image?.id]: fileLink?.link,
        });
      }
    }

    const mappedImage = imageMap[imageId];

    if (mappedImage) {
      setUrl(mappedImage);
    } else {
      getImageUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  return (
    <img
      alt={playlist?.data?.title}
      height={size}
      src={url || `${process.env.PUBLIC_URL}/android-icon-96x96.png`}
      width={size}
    />
  );
}

export default PlaylistImage;
