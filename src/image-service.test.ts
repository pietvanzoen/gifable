import { getPrimaryColor, getImageSize } from './image-service';

describe('image helpers', () => {
  describe('getPrimaryColor', () => {
    it('should return primary color', async () => {
      const color = await getPrimaryColor(
        'https://xn--vi8h.piet.me/alright.gif'
      );
      expect(color).toBe('#418f85');
    });
  });

  describe('getImageSize', () => {
    it('should return image size', async () => {
      const size = await getImageSize('https://xn--vi8h.piet.me/alright.gif');
      expect(size).toEqual({ width: 500, height: 209, size: 418000 });
    });
  });
});
