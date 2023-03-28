import { DataSource } from 'typeorm';
import { initTestDataSource } from '../data-source';
import { AssetService } from './asset.service';
import { Fixtures, chance } from '../test-helpers';

describe('AssetService', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await initTestDataSource();
  });
  afterAll(async () => dataSource.destroy());
  beforeEach(async () => dataSource.synchronize(true));

  let assetService: AssetService;
  beforeEach(() => {
    assetService = new AssetService(dataSource);
  });

  describe('create', () => {
    it('creates asset', async () => {
      const url = chance.url();
      const asset = await assetService.create({ url, comment: 'wibble' });

      expect(asset).toMatchObject({
        url,
        comment: 'wibble',
      });
    });

    it('validates data', async () => {
      await expect(
        assetService.create({ url: 'wibble' })
      ).rejects.toMatchObject([
        expect.objectContaining({
          property: 'url',
          constraints: {
            isUrl: expect.stringMatching(/url/i),
          },
        }),
      ]);
    });
  });

  describe('getAll', () => {
    it('returns all assets', async () => {
      await assetService.create(Fixtures.Asset());
      await assetService.create(Fixtures.Asset());
      const assets = await assetService.getAll();
      expect(assets.length).toBe(2);
    });
  });
});
