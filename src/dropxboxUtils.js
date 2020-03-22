/**
 * Upload a file to dropbox
 */
export async function uploadFile(dbx, data, path) {
  // Upload playlist to dropbox (dropbox will return new metadata)
  const meta = await dbx.filesUpload({
    // Do not rename on conflict
    autorename: false,
    // File data to upload
    contents: JSON.stringify(data),
    // Overwrite previous version of file (if exists)
    mode: {
      ".tag": "overwrite"
    },
    // Do not notify users of change
    mute: true,
    // Path to file in dropbox
    path
  });
  return meta;
}
