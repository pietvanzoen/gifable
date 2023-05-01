import { payloadTooLarge } from "./request.server";
import bytes from "bytes";
import { storage } from "./storage.server";
import { getColor } from "colorthief";
import Jimp from "jimp";
import { debug } from "debug";
import type { Media, PrismaClient } from "@prisma/client";
const log = debug("app:media-helpers");

const MAX_FILE_SIZE = bytes("10MB");

export async function storeURL(
  originalURL: string,
  filename: string
): Promise<{ url: string; size: number }> {
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

  return { url, size: buffer.length };
}

export async function storeBuffer(
  buffer: Buffer,
  filename: string
): Promise<{ url: string; size: number }> {
  const { url } = await storage.upload(buffer, filename);
  return { url, size: buffer.length };
}

type ImageData = {
  color: string | null;
  width: number;
  height: number;
  thumbnail?: Buffer;
};

export async function getImageData(url: string): Promise<ImageData> {
  const image = await Jimp.read(url);
  const { width, height } = image.bitmap;
  let thumbnail: Buffer | undefined;

  if (url.endsWith(".gif")) {
    thumbnail = await image.getBufferAsync(Jimp.MIME_JPEG);
  }

  return {
    color: await getPrimaryColor(url),
    width,
    height,
    thumbnail,
  };
}

export async function reparse(media: Media) {
  const filename = storage.getFilenameFromURL(media.url);

  if (!filename) {
    return media;
  }

  const buffer = await storage.download(media.url);

  const { width, height, color, thumbnail } = await getImageData(media.url);

  let thumbnailUrl = media.thumbnailUrl;
  if (media.url.endsWith(".gif") && !thumbnailUrl && thumbnail) {
    const { url } = await storage.upload(thumbnail, filename);
    thumbnailUrl = url;
  }

  return {
    width,
    height,
    color,
    thumbnailUrl,
    size: buffer.length,
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

export async function rename(
  media: Pick<Media, "url" | "thumbnailUrl">,
  newFilename: string
) {
  const filename = storage.getFilenameFromURL(media.url);
  if (!filename) {
    return null;
  }
  const requests = [storage.rename(filename, newFilename)];

  const thumbnailFilename = storage.getFilenameFromURL(
    media.thumbnailUrl || ""
  );
  if (thumbnailFilename) {
    requests.push(
      storage.rename(thumbnailFilename, makeThumbnailFilename(newFilename))
    );
  }

  const [urlResp, thumbnailResp] = await Promise.all(requests);

  return {
    url: urlResp.url,
    thumbnailUrl: thumbnailResp?.url || null,
  };
}

export function makeThumbnailFilename(filename: string) {
  return `${filename.split(".")[0]}-thumbnail.jpg`;
}

export function getCommonCommentTerms(
  media: Pick<Media, "comment">[],
  limit: number
) {
  const terms = {} as Record<string, number>;
  media.forEach((m) => {
    m.comment?.split(",").forEach((c) => {
      const term = c.trim().toLowerCase();
      terms[term] = (terms[term] || 0) + 1;
    });
  });

  return Object.entries(terms)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export async function getMediaTerms(
  db: PrismaClient,
  limit: number = 5,
  userId?: string
) {
  const where = userId ? { userId } : {};
  const media = await db.media.findMany({
    where: {
      ...where,
      OR: [{ comment: { not: null } }, { comment: { not: "" } }],
    },
    select: {
      comment: true,
    },
  });

  return getCommonCommentTerms(media, limit);
}
