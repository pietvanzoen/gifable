import FileStorage from './file-storage';

describe('FileStorage', () => {
  describe.skip('uploadFile', () => {
    it('uploads a file', async () => {
      const storage = new FileStorage({
        bucket: 'test',
        basePath: 'test',
        storageBaseURL: 'https://play.min.io/test/',
        storage: {
          endPoint: 'play.min.io',
          port: 9000,
          useSSL: true,
          accessKey: 'Q3AM3UQ867SPQQA43P2F',
          secretKey: 'zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG',
        },
      });
      const url = 'https://xn--vi8h.piet.me/~/what.gif';

      const resp = await storage.uploadURL(url, `what.gif`);

      expect(resp).toMatchObject({
        wibble: expect.any(String),
      });
    }, 20_000);
  });
});
