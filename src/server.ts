import { PrismaClient } from '@prisma/client';
import Fastify, { FastifyServerOptions } from 'fastify';
import api from './api';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

type ServerOptions = {
  db: PrismaClient;
  options?: FastifyServerOptions;
};

export default async function server({ db, options }: ServerOptions) {
  const fastify = Fastify({
    logger: true,
    ...options,
  }).withTypeProvider<TypeBoxTypeProvider>();

  fastify.decorate<PrismaClient>('db', db);

  await fastify.register(api, { db, prefix: 'api' });

  return fastify;
}
