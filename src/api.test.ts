import { Asset, PrismaClient, User } from '@prisma/client';
import { Fixtures, createFileStorageMock, createTestDB } from './test-helpers';
import server from './server';
import { FastifyInstance } from 'fastify';
import FileStorage from './file-storage';
import { getImageData } from './image-service';
import bytes from 'bytes';

jest.mock('./image-service');

describe('/api', () => {
  let db: PrismaClient, app: FastifyInstance, storage: jest.Mocked<FileStorage>;

  beforeAll(async () => {
    db = createTestDB();
    storage = createFileStorageMock();
    app = await server({ db, storage, options: { logger: false } });
  });

  afterAll(async () => Promise.all([db.$disconnect(), app.close()]));

  let user: User;
  let session: string;
  beforeEach(async () => {
    await db.asset.deleteMany();
    user = await db.user.create({ data: {} });
    session = app.encodeSecureSession(
      app.createSecureSession({ userId: user.id })
    );

    jest.resetAllMocks();
  });

  describe('POST /assets', () => {
    it('creates asset', async () => {
      const { url, comment, alt } = Fixtures.Asset();
      const response = await app
        .inject()
        .cookies({ session })
        .post('/api/assets')
        .payload({ url, comment, alt });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        id: expect.any(Number),
        url,
        comment,
        alt,
      });
    });

    it('returns error when missing url', async () => {
      const response = await app
        .inject()
        .cookies({ session })
        .post('/api/assets')
        .payload({});

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/url/),
      });
    });

    it('returns error if url is invalid', async () => {
      const response = await app
        .inject()
        .cookies({ session })
        .post('/api/assets')
        .payload({ url: 'wibble' });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/url/),
      });
    });

    it('returns error if url is already in use', async () => {
      const data = Fixtures.Asset();
      await db.asset.create({
        data: { ...data, user: { connect: { id: user.id } } },
      });

      const response = await app
        .inject()
        .cookies({ session })
        .post('/api/assets')
        .payload(data);

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/url/),
      });
    });

    it('returns error if user not logged in', async () => {
      const data = Fixtures.Asset();
      const response = await app.inject().post('/api/assets').payload(data);

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/unauthorized/i),
      });
    });
  });

  describe('POST /assets/:id', () => {
    let asset: Asset;

    beforeEach(async () => {
      asset = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: user.id } } },
      });
    });

    it('updates asset', async () => {
      const { comment, alt } = Fixtures.Asset();
      const response = await app
        .inject()
        .cookies({ session })
        .post(`/api/assets/${asset.id}`)
        .payload({ comment, alt });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: asset.id,
        comment,
        alt,
      });
    });

    it('url is not required', async () => {
      const response = await app
        .inject()
        .cookies({ session })
        .post(`/api/assets/${asset.id}`)
        .payload({ comment: 'wibble' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: asset.id,
        comment: 'wibble',
      });
    });

    it('returns error when asset does not exist', async () => {
      const response = await app
        .inject()
        .cookies({ session })
        .post(`/api/assets/9999`)
        .payload(Fixtures.Asset());

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/not found/i),
      });
    });

    it('returns error if user not logged in', async () => {
      const data = Fixtures.Asset();
      const response = await app
        .inject()
        .post(`/api/assets/${asset.id}`)
        .payload(data);

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/unauthorized/i),
      });
    });

    it('returns error when updating asset belonging to another user', async () => {
      const otherUser = await db.user.create({ data: {} });
      const otherAsset = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: otherUser.id } } },
      });
      const response = await app
        .inject()
        .cookies({ session })
        .post(`/api/assets/${otherAsset.id}`)
        .payload(Fixtures.Asset());

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/not found/i),
      });
    });
  });

  describe('GET /assets', () => {
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    it('returns all asset that belong to user', async () => {
      const asset1 = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: user.id } } },
      });
      await sleep(0);
      const asset2 = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: user.id } } },
      });
      const otherUser = await db.user.create({ data: {} });
      await db.asset.create({
        data: {
          ...Fixtures.Asset(),
          user: { connect: { id: otherUser.id } },
        },
      });
      await db.asset.create({
        data: {
          ...Fixtures.Asset(),
          user: { connect: { id: otherUser.id } },
        },
      });

      const response = await app
        .inject()
        .cookies({ session })
        .get('/api/assets');

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([
        { id: asset2.id },
        { id: asset1.id },
      ]);
    });

    it('searches comments', async () => {
      const asset1 = await db.asset.create({
        data: {
          ...Fixtures.Asset({ comment: 'foo, bar' }),
          user: { connect: { id: user.id } },
        },
      });
      await db.asset.create({
        data: {
          ...Fixtures.Asset({ comment: 'baz, qux' }),
          user: { connect: { id: user.id } },
        },
      });

      const response = await app
        .inject()
        .cookies({ session })
        .get('/api/assets?search=foo');

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([{ id: asset1.id }]);
    });

    it('returns error if user not logged in', async () => {
      const response = await app.inject().get('/api/assets');

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/unauthorized/i),
      });
    });
  });

  describe('GET /assets/:id', () => {
    let asset: Asset;
    beforeEach(async () => {
      asset = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: user.id } } },
      });
    });

    it('returns asset', async () => {
      const response = await app
        .inject()
        .cookies({ session })
        .get(`/api/assets/${asset.id}`);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: asset.id });
    });

    it('returns error when asset does not exist', async () => {
      const response = await app
        .inject()
        .cookies({ session })
        .get(`/api/assets/9999`);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/not found/i),
      });
    });

    it('returns error if user not logged in', async () => {
      const response = await app.inject().get(`/api/assets/${asset.id}`);

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/unauthorized/i),
      });
    });

    it('returns error when asset does not belong to user', async () => {
      const otherUser = await db.user.create({ data: {} });
      const otherAsset = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: otherUser.id } } },
      });

      const response = await app
        .inject()
        .cookies({ session })
        .get(`/api/assets/${otherAsset.id}`);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/not found/i),
      });
    });
  });

  describe('DELETE /assets/:id', () => {
    let asset: Asset;
    beforeEach(async () => {
      asset = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: user.id } } },
      });
    });

    it('deletes asset', async () => {
      const response = await app
        .inject()
        .cookies({ session })
        .delete(`/api/assets/${asset.id}`);

      expect(response.statusCode).toBe(204);
      expect(response.json()).toBe(null);

      const deletedAsset = await db.asset.findUnique({
        where: { id: asset.id },
      });

      expect(deletedAsset).toBe(null);
    });

    it('returns error when asset does not belong to user', async () => {
      const otherUser = await db.user.create({ data: {} });
      const otherAsset = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: otherUser.id } } },
      });

      const response = await app
        .inject()
        .cookies({ session })
        .delete(`/api/assets/${otherAsset.id}`);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/not found/i),
      });
    });

    it('returns error if user not logged in', async () => {
      const response = await app.inject().delete(`/api/assets/${asset.id}`);

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/unauthorized/i),
      });
    });

    it('delete asset from storage', async () => {
      storage.getFilenameFromURL.mockReturnValue('foo.jpg');

      const response = await app
        .inject()
        .cookies({ session })
        .delete(`/api/assets/${asset.id}`);

      expect(response.statusCode).toBe(204);
      expect(storage.getFilenameFromURL).toHaveBeenCalledWith(asset.url);
      expect(storage.delete).toHaveBeenCalledWith('foo.jpg');
    });
  });

  describe('POST /upload-url', () => {
    it('uploads url to storage and creates asset', async () => {
      storage.download.mockResolvedValue(Buffer.from('foo'));
      storage.upload.mockResolvedValue({
        url: 'https://foo.bar/baz.jpg',
        etag: 'foo',
        versionId: 'bar',
      });

      const data = Fixtures.Upload();
      const response = await app
        .inject()
        .cookies({ session })
        .post('/api/upload-url')
        .payload(data);

      expect(response.statusCode).toBe(201);
      expect(storage.download).toHaveBeenCalledWith(
        data.url,
        expect.anything()
      );
      expect(storage.upload).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(String)
      );
      expect(response.json()).toMatchObject({
        id: expect.any(Number),
        url: 'https://foo.bar/baz.jpg',
      });
    });

    it('returns error if file already exists', async () => {
      const data = Fixtures.Upload();
      storage.exists.mockResolvedValue(true);

      const response = await app
        .inject()
        .cookies({ session })
        .post('/api/upload-url')
        .payload(data);

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/already exists/),
      });
    });

    it('returns error if user is not logged in', async () => {
      const data = Fixtures.Upload();
      const response = await app.inject().post('/api/upload-url').payload(data);

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/unauthorized/i),
      });
    });
  });

  describe('POST /assets/:id/parse', () => {
    beforeEach(() => {
      (
        getImageData as jest.MockedFunction<typeof getImageData>
      ).mockResolvedValue({
        width: 100,
        height: 100,
        color: '#000000',
        size: 1234,
      });
    });

    it('populates image data', async () => {
      const asset = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: user.id } } },
      });
      const response = await app
        .inject()
        .cookies({ session })
        .post(`/api/assets/${asset.id}/parse`);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: asset.id,
        width: 100,
        height: 100,
        color: '#000000',
        size: 1234,
      });
    });

    it('does not error if fetching image data fails', async () => {
      const asset = await db.asset.create({
        data: {
          ...Fixtures.Asset({ width: null, height: null, color: null }),
          user: { connect: { id: user.id } },
        },
      });
      (
        getImageData as jest.MockedFunction<typeof getImageData>
      ).mockRejectedValue(new Error('wibble'));

      const response = await app
        .inject()
        .cookies({ session })
        .post(`/api/assets/${asset.id}/parse`);

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: asset.id,
        width: null,
        height: null,
        color: null,
      });
    });

    it('returns error if asset does not belong to user', async () => {
      const otherUser = await db.user.create({ data: {} });
      const otherAsset = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: otherUser.id } } },
      });

      const response = await app
        .inject()
        .cookies({ session })
        .post(`/api/assets/${otherAsset.id}/parse`);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/not found/i),
      });
    });

    it('returns error if user is not logged in', async () => {
      const asset = await db.asset.create({
        data: { ...Fixtures.Asset(), user: { connect: { id: user.id } } },
      });

      const response = await app.inject().post(`/api/assets/${asset.id}/parse`);

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/unauthorized/i),
      });
    });
  });

  describe('POST /users', () => {
    it('creates user', async () => {
      const response = await app.inject().post('/api/users');

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        id: expect.any(Number),
        account: expect.any(String),
      });
    });

    it('sets session cookie', async () => {
      const response = await app.inject().post('/api/users');

      const newUser = response.json();
      expect(response.statusCode).toBe(201);
      const session = app.decodeSecureSession(response.cookies[0].value);
      expect(session?.get('userId')).toBe(newUser.id);
    });
  });

  describe('POST /login', () => {
    it('returns error if user does not exist', async () => {
      const response = await app
        .inject()
        .post('/api/login')
        .payload({ account: 'wibble' });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        message: expect.stringMatching(/not found/i),
      });
    });

    it('sets session cookie', async () => {
      const user = await db.user.create({ data: {} });

      const response = await app.inject().post('/api/login').payload({
        account: user.account,
      });

      expect(response.statusCode).toBe(200);
      const session = app.decodeSecureSession(response.cookies[0].value);
      expect(session?.get('userId')).toBe(user.id);
    });
  });
});
