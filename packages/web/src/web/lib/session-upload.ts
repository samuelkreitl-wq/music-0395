import { client } from "./api";

export const ACCEPTED_FILES = ".zip,.als,.logicx,.bandlab,.mid,.midi,.wav,.mp3,.m4a,.aiff,.aif,.flac,.ogg";
export const MAX_FILE_BYTES = 2 * 1024 ** 3;

export function fileSize(bytes: number) {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export async function uploadSessionFile(sessionId: number, file: File, progress: (percent: number) => void) {
  if (file.size > MAX_FILE_BYTES) throw new Error("Files must be 2 GB or smaller. Split large archives before uploading.");
  const contentType = file.type || "application/octet-stream";
  const { url, key } = await client.sessions.presignUpload({ sessionId, filename: file.name, contentType });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage upload failed (${xhr.status}). Retry the file.`));
    xhr.onerror = () => reject(new Error("Upload connection failed. Check your connection and retry."));
    xhr.send(file);
  });
  await client.sessions.addFile({ sessionId, key, name: file.name, contentType });
}