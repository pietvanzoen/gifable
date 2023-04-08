import { PassThrough } from 'stream';
import FileStorage from './file-storage';
import { Response, fetch } from 'fetch-h2';
import * as Minio from 'minio';

jest.mock('minio');
jest.mock('fetch-h2');

describe('FileStorage', () => {
  let fileStorage: FileStorage;

  beforeEach(() => {
    jest.resetAllMocks();

    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      readable: jest.fn().mockResolvedValue(new PassThrough()),
    } as unknown as Response);

    Minio.Client.prototype.putObject = jest.fn().mockResolvedValue({
      etag: 'test-etag',
      versionId: 'test-version-id',
    });

    fileStorage = new FileStorage({
      bucket: 'test-bucket',
      storageBaseURL: 'https://test-bucket.s3.amazonaws.com',
      basePath: 'test-base-path',
      maxFileSize: 1000000,
      storage: {
        endPoint: 's3.amazonaws.com',
        useSSL: true,
        accessKey: 'test-access-key',
        secretKey: 'test-secret-key',
      },
    });
  });

  describe('uploadFile', () => {
    let url: string;
    let filename: string;

    beforeEach(() => {
      url = 'https://test-bucket.s3.amazonaws.com/test-base-path/test.jpg';
      filename = 'test.jpg';
    });

    it('uploads a file', async () => {
      const uploadResponse = await fileStorage.uploadURL(url, filename);
      expect(uploadResponse).toEqual({
        url: 'https://test-bucket.s3.amazonaws.com/test-base-path/test.jpg',
        etag: 'test-etag',
        versionId: 'test-version-id',
      });
    });

    it('throws an error if the file is not found', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
      } as unknown as Response);
      await expect(fileStorage.uploadURL(url, filename)).rejects.toThrow(
        'Failed to fetch file'
      );
    });

    it('throws an error if filename is invalid', async () => {
      const filename = 'test.txt';
      await expect(fileStorage.uploadURL(url, filename)).rejects.toThrow(
        'Invalid filename'
      );
    });

    it('sets metaData', async () => {
      await fileStorage.uploadURL(url, filename);
      expect(Minio.Client.prototype.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-base-path/test.jpg',
        expect.anything(),
        expect.anything(),
        {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'max-age=86400',
        }
      );
    });
  });
});
