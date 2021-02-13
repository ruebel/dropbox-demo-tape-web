/**
 * Upload a file to dropbox
 */
export async function uploadFile(dbx, data, path) {
  // Upload playlist to dropbox (dropbox will return new metadata)
  const { result } = await dbx.filesUpload({
    // Do not rename on conflict
    autorename: false,
    // File data to upload
    contents: JSON.stringify(data),
    // Overwrite previous version of file (if exists)
    mode: {
      ".tag": "overwrite",
    },
    // Do not notify users of change
    mute: true,
    // Path to file in dropbox
    path,
  });
  return result;
}

async function getImageUrl(dbx, path) {
  if (path) {
    const fileLink = await dbx.filesGetTemporaryLink({
      path,
    });
    return fileLink?.result?.link;
  }
}

export async function getImagePath(dbx, imageId, imagePath, imageMap) {
  const mappedImage = imageMap[imageId];

  if (mappedImage) {
    return mappedImage;
  } else if (imagePath) {
    const url = await getImageUrl(dbx, imagePath);
    return url;
  }
  return undefined;
}
