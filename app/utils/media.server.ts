import { payloadTooLarge } from "./request.server";
import bytes from "bytes";
import { storage } from "./s3-storage.server";
import { debug } from "debug";
import type { Media } from "@prisma/client";
import { db } from "./db.server";
import { LRUCache } from "lru-cache";
import ms from "ms";
import { getImageData } from "./image.server";
const log = debug("app:media-helpers");

const MAX_FILE_SIZE = bytes("10MB");

type UploadOutput = {
  url: string;
  size: number;
  hash: string;
};

export async function downloadUrl(originalURL: string): Promise<Buffer> {
  return storage().download(originalURL, {
    progress(size) {
      if (size > MAX_FILE_SIZE) {
        throw payloadTooLarge({
          formError: `File size is too large (max ${bytes(MAX_FILE_SIZE)})`,
        });
      }
    },
  });
}

export async function storeBuffer(
  buffer: Buffer,
  filename: string
): Promise<UploadOutput> {
  const exists = await storage().exists(filename);

  if (exists) {
    throw new Error("File already exists");
  }

  const { url, hash } = await storage().upload(buffer, filename);
  return { url, size: buffer.length, hash };
}

export async function reparse(media: Media) {
  const filename = storage().getFilenameFromURL(media.url);

  if (!filename) {
    return media;
  }

  const buffer = await storage().download(media.url);

  const { width, height, color, thumbnail } = await getImageData(buffer);

  const { url: thumbnailUrl } = await storage().upload(
    thumbnail,
    makeThumbnailFilename(filename)
  );

  let fileHash = media.fileHash;
  if (!fileHash) {
    fileHash = await storage().getHash(buffer);
  }

  return {
    width,
    height,
    color,
    thumbnailUrl,
    size: buffer.length,
    fileHash,
  };
}

export async function deleteURL(url: string | null) {
  if (!url) {
    return;
  }
  const filename = storage().getFilenameFromURL(url);
  if (!filename) {
    return;
  }
  await storage().delete(filename);
}

export async function rename(
  media: Pick<Media, "url" | "thumbnailUrl">,
  newFilename: string
) {
  const filename = storage().getFilenameFromURL(media.url);
  if (!filename) {
    return null;
  }
  const requests = [storage().rename(filename, newFilename)];

  const thumbnailFilename = storage().getFilenameFromURL(
    media.thumbnailUrl || ""
  );
  if (thumbnailFilename) {
    requests.push(
      storage().rename(thumbnailFilename, makeThumbnailFilename(newFilename))
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

type TermsOptions = {
  limit?: number;
  filter?: (term: [string, number]) => boolean;
  randomize?: boolean;
};

type LabelsList = [string, number][];

export function getCommonLabelsTerms(
  media: Pick<Media, "labels">[],
  { limit = 5, filter = () => true, randomize = false }: TermsOptions
): LabelsList {
  const terms = media.reduce((terms, m) => {
    m.labels?.split(",").forEach((c) => {
      const term = c.trim().toLowerCase();
      terms[term] = (terms[term] || 0) + 1;
    });
    return terms;
  }, {} as Record<string, number>);

  return Object.entries(terms)
    .filter(([term, count]) => count > 1 && term && filter([term, count]))
    .sort((a, b) => {
      if (randomize) {
        return Math.random() - 0.5;
      }
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit);
}

declare global {
  var labelsCache: LRUCache<string, LabelsList>;
}

global.labelsCache =
  global.labelsCache ||
  new LRUCache<string, LabelsList>({
    max: 40,
    ttl: ms("5m"),
  });

export async function getMediaLabels(
  options?: TermsOptions & { userId?: string | { not: string } }
) {
  const cacheKey = JSON.stringify(options);

  const cached = labelsCache.get(cacheKey);
  if (cached) {
    log("Using cached labels", { cacheKey });
    return cached;
  }

  const { userId, ...termsOptions } = options || {};

  log("Fetching labels", { cacheKey });

  const where = userId ? { userId } : {};
  const media = await db.media.findMany({
    where: {
      ...where,
      OR: [{ labels: { not: null } }, { labels: { not: "" } }],
    },
    select: {
      labels: true,
    },
  });

  labelsCache.set(cacheKey, getCommonLabelsTerms(media, termsOptions));

  return labelsCache.get(cacheKey);
}

export async function getMediaSuggestions(
  media: Pick<Media, "id" | "fileHash" | "altText" | "labels">
) {
  const suggestionsWhere = {
    fileHash: media.fileHash,
    id: { not: media.id },
  };

  const [[altTextMedia], [labelsMedia]] = await Promise.all([
    media.altText
      ? [null]
      : db.media.findMany({
          where: {
            ...suggestionsWhere,
            AND: [{ altText: { not: "" } }, { altText: { not: null } }],
          },
          select: { altText: true },
          take: 1,
        }),
    media.labels
      ? [null]
      : db.media.findMany({
          where: {
            ...suggestionsWhere,
            AND: [{ labels: { not: "" } }, { labels: { not: null } }],
          },
          select: { labels: true },
          take: 1,
        }),
  ]);

  return {
    altText: altTextMedia?.altText,
    labels: labelsMedia?.labels,
  };
}
