import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { AssetCreate, AssetCreateType, AssetType } from './api.types';

type ApiOptions = {
  db: PrismaClient;
};

export default async function api(app: FastifyInstance, { db }: ApiOptions) {
  app.post<{ Body: AssetCreateType; Reply: AssetType }>(
    '/assets',
    { schema: { body: AssetCreate } },
    async (request, reply) => {
      const asset = await db.asset.create({
        data: request.body,
      });

      reply.status(201);

      return asset;
    }
  );

  app.get<{ Reply: AssetType[] }>(
    '/assets',
    async () => await db.asset.findMany()
  );
}
