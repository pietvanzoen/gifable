import Chance from 'chance';
import { Prisma, PrismaClient } from '@prisma/client';

export const chance = new Chance();

export const Fixtures = {
  Asset(options?: Partial<Prisma.AssetCreateInput>): Prisma.AssetCreateInput {
    return {
      url: chance.url(),
      comment: chance.sentence(),
      ...options,
    };
  },
};

export function createTestDB() {
  return new PrismaClient({ datasources: { db: { url: 'file:./test.db' } } });
}
