import { AutoTokenizer, CLIPTextModelWithProjection, env } from '@xenova/transformers';

env.allowLocalModels = false;

let tokenizer: any = null;
let textModel: any = null;

export async function getClipTextEmbedding(text: string): Promise<number[]> {
  // 1. Explicitly load the tokenizer
  if (!tokenizer) {
    tokenizer = await AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32');
  }
  
  // 2. Explicitly load ONLY the Text portion of the CLIP model
  // This completely bypasses the caching bug that causes the "Missing pixel_values" error
  if (!textModel) {
    textModel = await CLIPTextModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32');
  }

  // 3. Convert string into token arrays
  const text_inputs = tokenizer(text);

  // 4. Generate the 512-dimensional vector embedding
  const { text_embeds } = await textModel(text_inputs);

  // 5. Convert the Tensor data into a standard JavaScript array for Qdrant
  return Array.from(text_embeds.data);
}