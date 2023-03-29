import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import api from './api';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

type ServerOptions = {
  db: PrismaClient;
};

export default async function server({ db }: ServerOptions) {
  const fastify = Fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  fastify.decorate<PrismaClient>('db', db);

  fastify.register(api, { db, prefix: 'api' });

  return fastify;
}
