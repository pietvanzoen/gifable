import { payloadTooLarge } from "./request.server";
import bytes from "bytes";
import { storage } from "./storage.server";
import { getColor } from "colorthief";
import Jimp from "jimp";
import { debug } from "debug";
const log = debug("app:media-helpers");

const MAX_FILE_SIZE = bytes("10MB");

export async function storeURL(
  originalURL: string,
  filename: string
): Promise<string> {
  const buffer = await storage.download(originalURL, {
    progress(size) {
      if (size > MAX_FILE_SIZE) {
        throw payloadTooLarge({
          formError: `File size is too large (max ${bytes(MAX_FILE_SIZE)})`,
        });
      }
    },
  });

  const { url } = await storage.upload(buffer, filename);

  return url;
}

export async function storeBuffer(buffer: Buffer, filename: string) {
  const { url } = await storage.upload(buffer, filename);
  return url;
}

type ImageData = {
  color: string | null;
  width: number;
  height: number;
  size: number;
  thumbnail?: Buffer;
};

export async function getImageData(url: string): Promise<ImageData> {
  const image = await Jimp.read(url);
  const { width, height, data } = image.bitmap;
  let thumbnail: Buffer | undefined;

  if (url.endsWith(".gif")) {
    thumbnail = await image.getBufferAsync(Jimp.MIME_JPEG);
  }

  return {
    color: await getPrimaryColor(url),
    width,
    height,
    size: data.length,
    thumbnail,
  };
}

export async function getPrimaryColor(url: string): Promise<string | null> {
  try {
    const color: [number, number, number] = await getColor(url);
    return `#${color.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  } catch (e) {
    log("Failed to get primary color", e);
    return null;
  }
}

export async function deleteURL(url: string | null) {
  if (!url) {
    return;
  }
  const filename = storage.getFilenameFromURL(url);
  if (!filename) {
    return;
  }
  await storage.delete(filename);
}
