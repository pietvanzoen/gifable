import { Prisma, PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import {
  AssetCreate,
  AssetCreateType,
  AssetSearch,
  AssetSearchType,
  AssetType,
  AssetUpdate,
  AssetUpdateType,
  UpdateParams,
  UpdateParamsType,
} from './api.types';
import { errorHandler } from './error-handler';
import createHttpError from 'http-errors';

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
    Body: AssetUpdateType;
    Params: UpdateParamsType;
    Reply: AssetType;
  }>(
    '/assets/:id',
    { schema: { params: UpdateParams, body: AssetUpdate } },
    async (request, reply) => {
      const asset = await db.asset.update({
        where: { id: request.params.id },
        data: request.body,
      });

      reply.status(200);

      return asset;
    }
  );

  app.get<{
    Params: UpdateParamsType;
    Reply: AssetType;
  }>('/assets/:id', { schema: { params: UpdateParams } }, async (request) => {
    const asset = await db.asset.findUnique({
      where: { id: request.params.id },
    });
    if (!asset) throw createHttpError.NotFound();

    return asset;
  });

  app.get<{ Reply: AssetType[]; Querystring: AssetSearchType }>(
    '/assets',
    { schema: { querystring: AssetSearch } },
    async (request) => {
      const { search } = request.query;
      const where: Prisma.AssetWhereInput = {};
      if (search) {
        where.comment = { contains: search.trim() };
      }
      return db.asset.findMany({ where, orderBy: { createdAt: 'desc' } });
    }
  );

  app.delete<{
    Params: UpdateParamsType;
    Reply: null;
  }>(
    '/assets/:id',
    { schema: { params: UpdateParams } },
    async (request, reply) => {
      const asset = await db.asset.delete({
        where: { id: request.params.id },
      });
      if (!asset) throw createHttpError.NotFound();

      reply.status(204);
      return null;
    }
  );

  app.setErrorHandler(errorHandler);
}
