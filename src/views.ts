import fastifyView from '@fastify/view';
import eta from 'eta';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fs from 'node:fs/promises';

export default async function api(app: FastifyInstance) {
  app.register(fastifyView, {
    engine: { eta },
    defaultContext: {
      buildSHA: (await fs.readFile('build_sha', 'utf8')).trim(),
    },
  });

  app.get('/', async (request, reply) => {
    if (!assertSession(request, reply)) return;
    reply.view('/views/search.eta', { view: 'search' });
  });

  app.get('/add', async (request, reply) => {
    if (!assertSession(request, reply)) return;
    reply.view('/views/add.eta', { view: 'add' });
  });

  app.get<{
    Params: { id: number };
  }>('/view/:id', async (request, reply) => {
    if (!assertSession(request, reply)) return;
    const userId = request.session.get('userId');
    const asset = await app.db.asset.findMany({
      where: {
        id: Number(request.params.id),
        userId,
      },
      select: { id: true },
    });
    if (!asset.length) {
      reply.status(404).view('/views/404.eta');
      return;
    }

    reply.view('/views/view.eta', { view: 'view' });
  });

  app.get('/logout', async (request, reply) => {
    request.session.delete();
    reply.redirect('/login');
  });

  app.get('/login', async (request, reply) => {
    reply.view('/views/login.eta', {
      view: 'login',
      signupDisabled: Boolean(process.env.DISABLE_SIGNUP),
    });
  });

  app.get('/signup', async (request, reply) => {
    if (process.env.DISABLE_SIGNUP) {
      reply.status(404).view('/views/404.eta');
      return;
    }
    reply.view('/views/signup.eta', {
      view: 'signup',
      signupDisabled: Boolean(process.env.DISABLE_SIGNUP),
    });
  });

  app.get('*', async (request, reply) => {
    reply.status(404).view('/views/404.eta');
  });

  function assertSession(request: FastifyRequest, reply: FastifyReply) {
    request.log.info(`userId: ${request.session.get('userId')}`);
    if (!request.session.get('userId')) {
      reply.redirect('/login?redirect=' + request.url);
      return false;
    }
    return true;
  }
}
