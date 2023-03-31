import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import server from './server';
dotenv.config();

const { PORT = 3000 } = process.env;

export default async function main() {
  const db = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  await db.$connect();

  const fastify = server({ db });

  return fastify;
}

if (require.main === module) {
  main()
    .then((fastify) => {
      fastify.listen({ port: Number(PORT), host: '0.0.0.0' }, (err) => {
        if (err) {
          fastify.log.error(err);
          process.exit(1);
        }
        fastify.log.info(`Server started`);
      });
    })
    .catch((err) => {
      console.error('failed to start server.', err);
      process.exit(1);
    });
}
