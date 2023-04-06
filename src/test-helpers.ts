import Chance from 'chance';
import { Prisma, PrismaClient } from '@prisma/client';
import FileStorage, { UploadResponse } from './file-storage';
import { UploadType } from './api.types';
jest.mock('./file-storage');

export const chance = new Chance();

export const Fixtures = {
  Asset(options?: Partial<Prisma.AssetCreateInput>): Prisma.AssetCreateInput {
    return {
      url: chance.url(),
      comment: chance.sentence(),
      width: chance.integer({ min: 1, max: 1000 }),
      height: chance.integer({ min: 1, max: 1000 }),
      color: chance.color(),
      ...options,
    };
  },

  Upload(options?: Partial<UploadType>): UploadType {
    return {
      url: chance.url(),
      filename: chance.word() + '.jpg',
      ...options,
    };
  },
};

export function createFileStorageMock(): jest.Mocked<FileStorage> {
  // @ts-ignore - Mocking a class
  return new FileStorage({});
}

export function createTestDB() {
  return new PrismaClient({ datasources: { db: { url: 'file:./test.db' } } });
}
