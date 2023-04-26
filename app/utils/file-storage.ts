import { fetch } from "fetch-h2";
import * as Minio from "minio";
import { debug } from "debug";
import path from "node:path";
import assert from "node:assert";
const debugLog = debug("app:file-storage");

type FileStorageOptions = {
  bucket: string;
  storageBaseURL: string;
  basePath?: string;
  storage: Minio.ClientOptions;
};

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
};

export const FILENAME_REGEX =
  /^([a-z0-9_-]+\/)?[a-z0-9_-]+\.(gif|jpg|png|jpeg)$/;

export type UploadResponse = Minio.UploadedObjectInfo & { url: string };

export default class FileStorage {
  private minioClient: Minio.Client;
  private bucket: string;
  private storageBaseURL: string;
  private basePath?: string;

  constructor(options: FileStorageOptions) {
    this.minioClient = new Minio.Client(options.storage);
    this.bucket = options.bucket;
    this.basePath = options.basePath;
    this.storageBaseURL = options.storageBaseURL;
  }

  async exists(filename: string): Promise<boolean> {
    const filePath = this.makeFilePath(filename);
    debugLog("exists", filePath);
    return Boolean(
      await this.minioClient
        .statObject(this.bucket, filePath)
        .catch(() => false)
    );
  }

  async upload(buffer: Buffer, filename: string): Promise<UploadResponse> {
    assert(FILENAME_REGEX.test(filename), `Invalid filename "${filename}"`);

    const filePath = this.makeFilePath(filename);

    debugLog("uploading file", filePath);

    const metaData = {
      "Content-Type": EXTENSION_TO_MIME_TYPE[path.extname(filename).slice(1)],
      "Cache-Control": "max-age=86400",
    };

    const data = await this.minioClient.putObject(
      this.bucket,
      filePath,
      buffer,
      buffer.length,
      metaData
    );

    return {
      ...data,
      url: this.makeFileURL(filePath),
    };
  }

  private makeFilePath(filename: string) {
    const basePath = this.basePath || "";
    return path.join(basePath.replace("^/", ""), filename);
  }

  private makeFileURL(filePath: string) {
    return new URL(filePath, this.storageBaseURL).toString();
  }

  async download(
    url: string,
    options?: { progress?: (size: number) => void }
  ): Promise<Buffer> {
    debugLog("downloading file", url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch file");
    }
    return response.readable().then((stream) => {
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk) => {
          chunks.push(chunk);
          const totalSize = chunks.reduce(
            (acc, chunk) => acc + chunk.length,
            0
          );
          if (options?.progress) {
            try {
              options.progress(totalSize);
            } catch (err) {
              reject(err);
            }
          }
        });
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });
    });
  }

  getFilenameFromURL(url: string): string | null {
    const baseStorageURL = new URL(this.basePath || "", this.storageBaseURL)
      .href;

    if (!url.startsWith(baseStorageURL)) {
      return null;
    }

    return url.slice(baseStorageURL.length + 1);
  }

  async delete(filename: string): Promise<void> {
    const filePath = this.makeFilePath(filename);
    debugLog("deleting file", filePath);
    await this.minioClient.removeObject(this.bucket, filePath);
  }

  async rename(
    oldFilename: string,
    newFilename: string
  ): Promise<{ url: string }> {
    const oldFilePath = this.makeFilePath(oldFilename);
    const newFilePath = this.makeFilePath(newFilename);
    debugLog("renaming file", this.bucket, oldFilePath, newFilePath);

    await this.minioClient.copyObject(
      this.bucket,
      newFilePath,
      `/${this.bucket}/${oldFilePath}`,
      // @ts-ignore https://github.com/minio/minio-js/issues/1097
      null
    );
    await this.delete(oldFilename);
    return {
      url: this.makeFileURL(newFilePath),
    };
  }
}
