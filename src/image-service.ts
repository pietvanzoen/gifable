import { getColor } from 'colorthief';
import Jimp from 'jimp';

type ImageData = {
  color: string;
  width: number;
  height: number;
  size: number;
};

export async function getImageData(url: string): Promise<ImageData> {
  const [color, imgData] = await Promise.all([
    getPrimaryColor(url),
    getImageSize(url),
  ]);
  return { color, ...imgData };
}

export async function getPrimaryColor(url: string): Promise<string> {
  const color: [number, number, number] = await getColor(url);
  return `#${color.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export async function getImageSize(
  url: string
): Promise<{ width: number; height: number; size: number }> {
  const image = await Jimp.read(url);
  const { width, height, data } = image.bitmap;
  return { width, height, size: data.length };
}
