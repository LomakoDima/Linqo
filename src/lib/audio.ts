// Unlike images (which get embedded as data URLs straight into the profile
// JSON — see lib/image.ts), an uploaded track is sent to the server to be
// stored as its own Blob object and referenced by URL, since audio can't be
// squeezed into the profile's small size budget the way a recompressed
// thumbnail can. This just reads the file into the base64 payload the
// uploadMusicTrack server fn expects (see lib/publish.ts).
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}
