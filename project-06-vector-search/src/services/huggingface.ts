import axios from 'axios';
import 'dotenv/config';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

/**
 * Hugging Face Embedding Models
 * 
 * Model configurations with dimensions:
 * - all-MiniLM-L6-v2: 384 dimensions (fast, lightweight)
 * - all-mpnet-base-v2: 768 dimensions (better quality)
 * - all-MiniLM-L12-v2: 384 dimensions
 * - multilingual-e5-small: 384 dimensions
 */

export interface HuggingFaceEmbeddingResponse {
  embedding: number[];
  model: string;
  dimension: number;
  inference_time?: number;
}

export interface HuggingFaceModelConfig {
  modelId: string;
  dimensions: number;
  dbFieldName: string;
  description: string;
}

// Available models configuration
export const HUGGINGFACE_MODELS: Record<string, HuggingFaceModelConfig> = {
  minilm: {
    modelId: 'sentence-transformers/all-MiniLM-L6-v2',
    dimensions: 384,
    dbFieldName: 'plot_embedding_huggingface_minilm',
    description: 'Fast, lightweight (384 dims)',
  },
  mpnet: {
    modelId: 'sentence-transformers/all-mpnet-base-v2',
    dimensions: 768,
    dbFieldName: 'plot_embedding_huggingface_mpnet',
    description: 'High quality (768 dims)',
  },
  minilm_l12: {
    modelId: 'sentence-transformers/all-MiniLM-L12-v2',
    dimensions: 384,
    dbFieldName: 'plot_embedding_huggingface_minilm_l12',
    description: 'Balanced quality (384 dims)',
  },
};

/**
 * Generate text embedding using Hugging Face API
 * 
 * @param text - Text to embed
 * @param model - Model identifier (minilm, mpnet, minilm_l12)
 * @returns Float32Array with embedding
 */
export async function generateHuggingFaceEmbedding(
  text: string,
  model: string = 'minilm',
): Promise<Float32Array> {
  try {
    if (!HUGGING_FACE_API_KEY) {
      throw new Error('HUGGING_FACE_API_KEY environment variable is not set');
    }

    const modelConfig = HUGGINGFACE_MODELS[model];
    if (!modelConfig) {
      throw new Error(
        `Invalid model: ${model}. Available: ${Object.keys(HUGGINGFACE_MODELS).join(', ')}`,
      );
    }

    console.log(`📡 Calling Hugging Face API`);
    console.log(`   Model: ${modelConfig.modelId}`);
    console.log(`   Dimensions: ${modelConfig.dimensions}`);

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${modelConfig.modelId}`,
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    // Hugging Face returns: [[embedding_values]]
    const embedding = response.data[0] || [];

    if (!embedding || embedding.length === 0) {
      throw new Error('No embedding returned from Hugging Face API');
    }

    console.log(`✅ Embedding generated: ${embedding.length} dimensions`);

    return new Float32Array(embedding);
  } catch (error) {
    console.error('❌ Error generating Hugging Face embedding:', error);
    throw new Error(`Failed to generate Hugging Face embedding: ${error}`);
  }
}

/**
 * Generate embeddings for multiple texts
 * 
 * @param texts - Array of texts to embed
 * @param model - Model identifier
 * @returns Array of Float32Arrays
 */
export async function generateBatchHuggingFaceEmbeddings(
  texts: string[],
  model: string = 'minilm',
): Promise<Float32Array[]> {
  try {
    if (!HUGGING_FACE_API_KEY) {
      throw new Error('HUGGING_FACE_API_KEY environment variable is not set');
    }

    const modelConfig = HUGGINGFACE_MODELS[model];
    if (!modelConfig) {
      throw new Error(
        `Invalid model: ${model}. Available: ${Object.keys(HUGGINGFACE_MODELS).join(', ')}`,
      );
    }

    console.log(`📡 Batch embedding (${texts.length} texts) using ${modelConfig.modelId}`);

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${modelConfig.modelId}`,
      { inputs: texts },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    // Response format: [[embeddings], [embeddings], ...]
    const embeddings = response.data.map((embedding: number[]) => new Float32Array(embedding));

    console.log(`✅ Generated ${embeddings.length} embeddings`);

    return embeddings;
  } catch (error) {
    console.error('❌ Error generating batch Hugging Face embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error}`);
  }
}

/**
 * Verify embedding dimensions
 */
export function verifyHuggingFaceDimensions(
  embedding: Float32Array,
  expectedDim: number,
): boolean {
  if (embedding.length !== expectedDim) {
    console.error(
      `❌ Dimension mismatch! Expected ${expectedDim}, got ${embedding.length}`,
    );
    return false;
  }
  return true;
}

/**
 * Get embedding statistics for debugging
 */
export function getHuggingFaceEmbeddingStats(embedding: Float32Array) {
  const arr = Array.from(embedding);
  return {
    dimension: embedding.length,
    byteLength: embedding.byteLength,
    min: Math.min(...arr),
    max: Math.max(...arr),
    mean: arr.reduce((a, b) => a + b) / arr.length,
    magnitude: Math.sqrt(arr.reduce((a, b) => a + b * b, 0)),
    sample_first_5: arr.slice(0, 5),
  };
}

/**
 * Test embedding generation
 */
export async function testHuggingFaceEmbedding(
  model: string = 'minilm',
): Promise<HuggingFaceEmbeddingResponse> {
  try {
    const modelConfig = HUGGINGFACE_MODELS[model];
    if (!modelConfig) {
      throw new Error(`Invalid model: ${model}`);
    }

    const testText = 'This is a test embedding from Hugging Face';
    const embedding = await generateHuggingFaceEmbedding(testText, model);

    return {
      embedding: Array.from(embedding),
      model: modelConfig.modelId,
      dimension: embedding.length,
    };
  } catch (error) {
    console.error('❌ Error in test embedding:', error);
    throw new Error(`Test embedding failed: ${error}`);
  }
}

/**
 * Convert Float32Array to Binary for MongoDB storage
 * Used when storing embeddings in documents
 */
export function convertHuggingFaceEmbeddingToBinary(embedding: Float32Array): Buffer {
  const buffer = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
  return buffer;
}

/**
 * Get all available models info
 */
export function getAvailableModels() {
  return Object.entries(HUGGINGFACE_MODELS).map(([key, config]) => ({
    id: key,
    modelId: config.modelId,
    dimensions: config.dimensions,
    dbField: config.dbFieldName,
    description: config.description,
  }));
}