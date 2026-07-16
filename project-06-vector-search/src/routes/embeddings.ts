import { Router, Request, Response } from 'express';
import axios from 'axios';
import 'dotenv/config';
import { convertEmbeddingToBinary } from '../services/binaryConversion';
import { testEmbedding } from '../services/embeddings';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const HUGGING_FACE_MODEL = process.env.HUGGING_FACE_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimension: number;
}

const router = Router();

/**
 * Generate text embeddings using Hugging Face API
 * Returns Float32Array wrapped in Binary format for MongoDB
 */
export async function generateTextEmbedding(text: string): Promise<Float32Array> {
  try {
    if (!HUGGING_FACE_API_KEY) {
      throw new Error('HUGGING_FACE_API_KEY environment variable is not set');
    }

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${HUGGING_FACE_MODEL}`,
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
        },
      },
    );

    // Response format: [[embedding_values]]
    const embedding = response.data[0] || [];
    return new Float32Array(embedding);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
  try {
    if (!HUGGING_FACE_API_KEY) {
      throw new Error('HUGGING_FACE_API_KEY environment variable is not set');
    }

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${HUGGING_FACE_MODEL}`,
      { inputs: texts },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
        },
      },
    );

    // Response format: [[embeddings], [embeddings], ...]
    return response.data.map((embedding: number[]) => new Float32Array(embedding));
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error}`);
  }
}

/**
 * ⭐ BINARY CONVERSION - Main function for storage
 * Convert Float32Array to Binary for MongoDB storage
 */
export function embeddingToDatabase(embedding: Float32Array): Buffer {
  return convertEmbeddingToBinary(embedding);
}

/**
 * Test embedding generation
 * GET /api/vector/embeddings/test
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing embedding generation...');
    const result = await testEmbedding();

    return res.json({
      message: 'Embedding generation successful',
      model: result.model,
      dimension: result.dimension,
      sample_embedding: result.embedding.slice(0, 10),
      full_dimension_count: result.embedding.length,
    });
  } catch (error) {
    console.error('Embedding test error:', error);
    res.status(500).json({ error: `Embedding test failed: ${error}` });
  }
});

/**
 * Generate custom embedding
 * POST /api/vector/embeddings/generate
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`📝 Generating embedding for: "${text}"`);
    const embedding = await generateTextEmbedding(text);

    return res.json({
      text,
      embedding: Array.from(embedding),
      dimension: embedding.length,
      sample: Array.from(embedding.slice(0, 10)),
    });
  } catch (error) {
    console.error('Generate embedding error:', error);
    res.status(500).json({ error: `Failed to generate embedding: ${error}` });
  }
});

export default router;