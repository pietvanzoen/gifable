import { fetch } from 'fetch-h2';
import * as Minio from 'minio';
import { Readable } from 'node:stream';
import { debug } from 'debug';
import path from 'node:path';
import assert from 'node:assert';
const debugLog = debug('file-storage');

type FileStorageOptions = {
  bucket: string;
  storageBaseURL: string;
  basePath?: string;
  storage: Minio.ClientOptions;
};

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
};

export const FILENAME_REGEX = /^[a-z0-9-]+\.(gif|jpg|png|jpeg)$/;

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
    debugLog('exists', filePath);
    return Boolean(
      await this.minioClient
        .statObject(this.bucket, filePath)
        .catch(() => false)
    );
  }

  async uploadURL(url: string, filename: string): Promise<UploadResponse> {
    assert(FILENAME_REGEX.test(filename), 'Invalid filename');

    const filePath = this.makeFilePath(filename);
    debugLog('uploadURL', url, filePath);

    const fileStream = await this.getFileStream(url);

    debugLog('uploading file', filePath);

    const metaData = {
      'Content-Type': EXTENSION_TO_MIME_TYPE[path.extname(filename).slice(1)],
      'Cache-Control': 'max-age=86400',
    };

    const data = await this.minioClient.putObject(
      this.bucket,
      filePath,
      fileStream,
      fileStream.readableLength,
      metaData
    );

    return {
      ...data,
      url: this.makeFileURL(filePath),
    };
  }

  private makeFilePath(filename: string) {
    const basePath = this.basePath || '';
    return path.join(basePath.replace('^/', ''), filename);
  }

  private makeFileURL(filePath: string) {
    return new URL(filePath, this.storageBaseURL).toString();
  }

  private async getFileStream(url: string): Promise<Readable> {
    debugLog('downloading file', url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }
    return new Readable().wrap(await response.readable());
  }
}
