import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

let textExtractor: any = null;

export async function getTextEmbedding(text: string): Promise<number[]> {
  if (!textExtractor) {
    textExtractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const output = await textExtractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}