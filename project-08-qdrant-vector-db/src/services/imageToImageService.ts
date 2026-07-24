import { pipeline, env } from '@xenova/transformers';
import { processImageToRaw } from './imageProcessingService';

env.allowLocalModels = false;

let clipImageExtractor: any = null;

export async function getClipImageEmbedding(imageInput: string | Buffer): Promise<number[]> {
  if (!clipImageExtractor) {
    clipImageExtractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  }

  // Convert raw image/URL via Sharp pipeline to RawImage
  const rawImage = await processImageToRaw(imageInput);

  // Generate vector embedding
  const output = await clipImageExtractor(rawImage);
  return Array.from(output.data);
}