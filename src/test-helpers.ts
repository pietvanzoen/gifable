import Chance from 'chance';
import { Prisma, PrismaClient } from '@prisma/client';
import FileStorage, { UploadResponse } from './file-storage';
import { UploadType } from './api.types';

export const chance = new Chance();

export const Fixtures = {
  Asset(options?: Partial<Prisma.AssetCreateInput>): Prisma.AssetCreateInput {
    return {
      url: chance.url(),
      comment: chance.sentence(),
      ...options,
    };
  },

  Upload(options?: Partial<UploadType>): UploadType {
    return {
      url: chance.url(),
      filename: chance.word(),
      ...options,
    };
  },
};

export function createFileStorageMock() {
  return {
    uploadURL: jest.fn().mockResolvedValue({
      etag: 'etag',
      url: chance.url(),
    } as UploadResponse),
  } as unknown as FileStorage;
}

export function createTestDB() {
  return new PrismaClient({ datasources: { db: { url: 'file:./test.db' } } });
}
