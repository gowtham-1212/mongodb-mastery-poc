import sharp from 'sharp';
import { RawImage } from '@xenova/transformers';

export async function processImageToRaw(input: string | Buffer): Promise<RawImage> {
  let imageBuffer: Buffer;

  if (typeof input === 'string') {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${input}`);
    }
    imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(" exec typeof input === 'string'")
  } else {
    imageBuffer = input;
  }

  // Use Sharp to convert image to raw RGB channels (3 channels, 8 bits per channel)
  const { data, info } = await sharp(imageBuffer)
    .removeAlpha() // Ensure 3 channels (RGB)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Instantiate RawImage using the raw pixel buffer, width, height, and channels
  return new RawImage(new Uint8Array(data), info.width, info.height, 3);
}