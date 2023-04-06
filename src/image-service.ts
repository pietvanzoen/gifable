import { getColor } from 'colorthief';
import Jimp from 'jimp';

type ImageData = {
  color: string;
  width: number;
  height: number;
};

export async function getImageData(url: string): Promise<ImageData> {
  const [color, [width, height]] = await Promise.all([
    getPrimaryColor(url),
    getImageSize(url),
  ]);
  return { color, width, height };
}

export async function getPrimaryColor(url: string): Promise<string> {
  const color: [number, number, number] = await getColor(url);
  return `#${color.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export async function getImageSize(url: string): Promise<[number, number]> {
  const image = await Jimp.read(url);
  return [image.bitmap.width, image.bitmap.height];
}
