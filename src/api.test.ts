import { Asset, Prisma, PrismaClient } from '@prisma/client';
import { Fixtures, createTestDB } from './test-helpers';
import server from './server';
import { FastifyInstance } from 'fastify';

describe('/api', () => {
  let db: PrismaClient, app: FastifyInstance;
  beforeAll(async () => {
    db = createTestDB();
    app = await server({ db, options: { logger: false } });
  });

  afterAll(async () => Promise.all([db.$disconnect(), app.close()]));

  beforeEach(async () => {
    await db.asset.deleteMany();
  });

  describe('POST /assets', () => {
    it('creates asset', async () => {
      const data = Fixtures.Asset();
      const response = await app.inject().post('/api/assets').payload(data);

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        id: expect.any(Number),
        ...data,
        // FIXME: Fastify serialization returns dates as objects
        // createdAt: expect.any(Date),
        // updatedAt: expect.any(Date),
      });
    });

    it('returns error when missing url', async () => {
      const response = await app.inject().post('/api/assets').payload({});

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/url/),
      });
    });

    it('returns error if url is invalid', async () => {
      const response = await app
        .inject()
        .post('/api/assets')
        .payload({ url: 'wibble' });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/url/),
      });
    });
  });

  describe('POST /assets/:id', () => {
    let asset: Asset;

    beforeEach(async () => {
      asset = await db.asset.create({ data: Fixtures.Asset() });
    });

    it('updates asset', async () => {
      const data = Fixtures.Asset();
      const response = await app
        .inject()
        .post(`/api/assets/${asset.id}`)
        .payload(data);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: asset.id,
        ...data,
      });
    });

    it('returns error when asset does not exist', async () => {
      const response = await app
        .inject()
        .post(`/api/assets/9999`)
        .payload(Fixtures.Asset());

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/not found/),
      });
    });

    it('returns error if url is invalid', async () => {
      const response = await app
        .inject()
        .post(`/api/assets/${asset.id}`)
        .payload({ url: 'wibble' });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/url/),
      });
    });
  });

  describe('GET /assets', () => {
    it('returns all asset', async () => {
      const [asset1, asset2] = await Promise.all([
        db.asset.create({ data: Fixtures.Asset() }),
        db.asset.create({ data: Fixtures.Asset() }),
      ]);

      const response = await app.inject().get('/api/assets');

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([
        { id: asset1.id },
        { id: asset2.id },
      ]);
    });
  });
});
