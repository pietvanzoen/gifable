import { getPrimaryColor, getImageData } from './image-service';

describe('image helpers', () => {
  describe('getPrimaryColor', () => {
    it('should return primary color', async () => {
      const color = await getPrimaryColor(
        'https://xn--vi8h.piet.me/alright.gif'
      );
      expect(color).toBe('#418f85');
    });
  });

  describe('getImageData', () => {
    it('should return image size', async () => {
      const size = await getImageData('https://xn--vi8h.piet.me/alright.gif');
      expect(size).toMatchObject({ width: 500, height: 209, size: 418000 });
    });
  });
});
