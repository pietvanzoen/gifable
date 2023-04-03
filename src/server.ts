import { PrismaClient } from '@prisma/client';
import Fastify, { FastifyServerOptions } from 'fastify';
import api from './api';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import path from 'path';
import fastifyStatic from '@fastify/static';
import createHttpError from 'http-errors';

type ServerOptions = {
  db: PrismaClient;
  options?: FastifyServerOptions;
};

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

export default async function server({ db, options }: ServerOptions) {
  const fastify = Fastify({
    logger: true,
    ...options,
  }).withTypeProvider<TypeBoxTypeProvider>();

  fastify.decorate<PrismaClient>('db', db);

  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
  });

  await fastify.register(api, { prefix: 'api' });

  fastify.get('/health', async () => {
    try {
      await db.$connect();
      return { status: 'ok' };
    } catch (error: any) {
      throw createHttpError.ServiceUnavailable(error?.message);
    }
  });

  return fastify;
}
