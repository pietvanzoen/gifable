import fastifySecureSession from '@fastify/secure-session';
import fastifyStatic from '@fastify/static';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { PrismaClient, User } from '@prisma/client';
import Fastify, { FastifyServerOptions } from 'fastify';
import fs from 'node:fs';
import createHttpError from 'http-errors';
import path from 'path';
import api from './api';
import views from './views';
import FileStorage from './file-storage';
import env from './env';

type ServerOptions = {
  db: PrismaClient;
  storage: FileStorage;
  options?: FastifyServerOptions;
};

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
    storage: FileStorage;
  }
}

declare module '@fastify/secure-session' {
  interface SessionData {
    userId: User['id'];
  }
}

export default async function server({ db, options, storage }: ServerOptions) {
  const fastify = Fastify({
    logger: true,
    ...options,
  }).withTypeProvider<TypeBoxTypeProvider>();

  fastify.decorate<PrismaClient>('db', db);
  fastify.decorate<FileStorage>('storage', storage);

  fastify.register(fastifyStatic, {
    prefix: '/public/',
    root: path.join(__dirname, '../public'),
  });

  fastify.register(fastifySecureSession, {
    key: fs.readFileSync(
      env.get('SESSION_KEY_PATH') || path.join(__dirname, '../secret_key')
    ),
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
    },
  });

  await fastify.register(views);

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
