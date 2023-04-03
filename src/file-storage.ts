import fetch from 'node-fetch';
import Minio, { ClientOptions } from 'minio';
import { Readable } from 'node:stream';

type FileStorageOptions = {
  bucket: string;
  storage: ClientOptions;
};

export default class FileStorage {
  private minioClient: Minio.Client;
  private bucket: string;

  constructor(options: FileStorageOptions) {
    this.minioClient = new Minio.Client(options.storage);
    this.bucket = options.bucket;
  }

  async uploadURL(url: string, filename: string) {
    const fileStream = await this.getFileStream(url);
    return this.minioClient.putObject(
      this.bucket,
      filename,
      fileStream,
      fileStream.readableLength
    );
  }

  private async getFileStream(url: string): Promise<Readable> {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error('Failed to fetch file');
    }
    return new Readable().wrap(response.body);
  }
}
