import { PassThrough } from "stream";
import FileStorage from "./file-storage";
import type { Response } from "fetch-h2";
import { fetch } from "fetch-h2";
import * as Minio from "minio";

jest.mock("minio");
jest.mock("fetch-h2");

describe("FileStorage", () => {
  let fileStorage: FileStorage;

  beforeEach(() => {
    jest.resetAllMocks();

    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      readable: jest.fn().mockResolvedValue(new PassThrough()),
    } as unknown as Response);

    Minio.Client.prototype.putObject = jest.fn().mockResolvedValue({
      etag: "test-etag",
      versionId: "test-version-id",
    });

    fileStorage = new FileStorage({
      bucket: "test-bucket",
      storageBaseURL: "https://test-bucket.s3.amazonaws.com",
      basePath: "test-base-path",
      storage: {
        endPoint: "s3.amazonaws.com",
        useSSL: true,
        accessKey: "test-access-key",
        secretKey: "test-secret-key",
      },
    });
  });

  describe("upload", () => {
    let buffer: Buffer;
    let filename: string;

    beforeEach(() => {
      buffer = Buffer.from("test");
      filename = "test.jpg";
    });

    it("uploads a file", async () => {
      const uploadResponse = await fileStorage.upload(buffer, filename);
      expect(uploadResponse).toEqual({
        url: "https://test-bucket.s3.amazonaws.com/test-base-path/test.jpg",
        etag: "test-etag",
        versionId: "test-version-id",
      });
    });

    it("throws an error if filename is invalid", async () => {
      const filename = "test.txt";
      await expect(fileStorage.upload(buffer, filename)).rejects.toThrow(
        "Invalid filename"
      );
    });

    it("allows single directory in filename", async () => {
      const filename = "test/test.jpg";
      await fileStorage.upload(buffer, filename);
      expect(Minio.Client.prototype.putObject).toHaveBeenCalledWith(
        "test-bucket",
        "test-base-path/test/test.jpg",
        buffer,
        buffer.length,
        {
          "Content-Type": "image/jpeg",
          "Cache-Control": "max-age=86400",
        }
      );
    });

    it("sets metaData", async () => {
      await fileStorage.upload(buffer, filename);
      expect(Minio.Client.prototype.putObject).toHaveBeenCalledWith(
        "test-bucket",
        "test-base-path/test.jpg",
        buffer,
        buffer.length,
        {
          "Content-Type": "image/jpeg",
          "Cache-Control": "max-age=86400",
        }
      );
    });
  });

  describe("getFilenameFromURL", () => {
    it("returns the filename from a URL", () => {
      const url =
        "https://test-bucket.s3.amazonaws.com/test-base-path/test.jpg";
      expect(fileStorage.getFilenameFromURL(url)).toBe("test.jpg");
    });

    it("returns null if the URL is not valid", () => {
      const url = "https://test-bucket.s3.amazonaws.com/test.jpg";
      expect(fileStorage.getFilenameFromURL(url)).toBeNull();
    });
  });

  describe("delete", () => {
    let filename: string;

    beforeEach(() => {
      filename = "test.jpg";
    });

    it("deletes a file", async () => {
      await fileStorage.delete(filename);
      expect(Minio.Client.prototype.removeObject).toHaveBeenCalledWith(
        "test-bucket",
        "test-base-path/test.jpg"
      );
    });
  });
});
