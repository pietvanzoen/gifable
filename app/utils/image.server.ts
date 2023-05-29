import quantize from "quantize";
import Jimp from "jimp";
import { debug } from "debug";
const log = debug("app:image-helpers");

type ImageData = {
  color: string | null;
  width: number;
  height: number;
  thumbnail: Buffer;
};

export async function getImageData(buffer: Buffer): Promise<ImageData> {
  const image = await Jimp.read(buffer);
  const { width, height } = image.bitmap;

  const [thumbnail, color] = await Promise.all([
    getThumbnail(image),
    getPrimaryColor(image),
  ]);

  return {
    color: color?.hex || null,
    width,
    height,
    thumbnail,
  };
}

type Color = {
  r: number;
  g: number;
  b: number;
  hex: string;
};

export async function getThumbnail(image: Jimp): Promise<Buffer> {
  return image
    .resize(500, Jimp.AUTO)
    .quality(80)
    .getBufferAsync(Jimp.MIME_JPEG);
}

export async function getPrimaryColor(image: Jimp): Promise<Color | null> {
  try {
    const pixels = buildPixelArray(image);

    const [r, g, b] = getColor(pixels);

    return {
      r,
      g,
      b,
      hex: `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`,
    };
  } catch (e) {
    log("Failed to get primary color", e);
    return null;
  }
}

function buildPixelArray(image: Jimp) {
  const { width, height } = image.bitmap;
  const pixels: [number, number, number][] = [];
  const interval = 15;

  image.scan(0, 0, width, height, function (x, y, idx) {
    if (idx % (interval * 4) !== 0) {
      return;
    }

    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];

    const rgb: [number, number, number] = [r, g, b];

    const ignore = a === undefined || a <= 125 || rgb.every((c) => c > 250);

    if (ignore) {
      return;
    }

    pixels.push(rgb);
  });

  return pixels;
}

function getColor(
  pixels: [number, number, number][]
): [number, number, number] {
  const cmap = quantize(pixels, 10);

  const pallette = cmap.palette();

  return pallette[0];
}
