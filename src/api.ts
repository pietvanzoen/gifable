import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import {
  AssetCreate,
  AssetCreateType,
  AssetType,
  UpdateParams,
  UpdateParamsType,
} from './api.types';
import { errorHandler } from './error-handler';

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

  app.post<{
    Body: AssetCreateType;
    Params: UpdateParamsType;
    Reply: AssetType;
  }>(
    '/assets/:id',
    { schema: { params: UpdateParams, body: AssetCreate } },
    async (request, reply) => {
      const asset = await db.asset.update({
        where: { id: request.params.id },
        data: request.body,
      });

      reply.status(200);

      return asset;
    }
  );

  app.get<{ Reply: AssetType[] }>(
    '/assets',
    async () => await db.asset.findMany()
  );

  app.setErrorHandler(errorHandler);
}
