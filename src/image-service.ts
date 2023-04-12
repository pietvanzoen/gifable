import { getColor } from 'colorthief';
import Jimp from 'jimp';
import { debug } from 'debug';
const log = debug('app:image-service');

type ImageData = {
  color: string | null;
  width: number;
  height: number;
  size: number;
  thumbnail?: Buffer;
};

export async function getImageData(url: string): Promise<ImageData> {
  const image = await Jimp.read(url);
  const { width, height, data } = image.bitmap;
  let thumbnail: Buffer | undefined;

  if (url.endsWith('.gif')) {
    thumbnail = await image.getBufferAsync(Jimp.MIME_JPEG);
  }

  return {
    color: await getPrimaryColor(url),
    width,
    height,
    size: data.length,
    thumbnail,
  };
}

export async function getPrimaryColor(url: string): Promise<string | null> {
  try {
    const color: [number, number, number] = await getColor(url);
    return `#${color.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  } catch (e) {
    log('Failed to get primary color', e);
    return null;
  }
}
