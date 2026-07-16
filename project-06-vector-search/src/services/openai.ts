import axios from 'axios';
import 'dotenv/config';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'text-embedding-ada-002';

/**
 * OpenAI Embedding Service
 * 
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 * This matches the plot_embedding field in MongoDB Atlas sample dataset
 * 
 * Model Details:
 * - text-embedding-3-small: 1536 dimensions (cost-effective)
 * - text-embedding-3-large: 3072 dimensions (higher accuracy)
 */

export interface OpenAIEmbeddingResponse {
  embedding: number[];
  model: string;
  dimension: number;
  usage: {
    prompt_tokens: number;
  };
}

/**
 * Generate text embedding using OpenAI API
 * Returns Float32Array with 1536 dimensions
 * 
 * @param text - Text to embed
 * @returns Float32Array with 1536 dimensions
 */
export async function generateOpenAIEmbedding(text: string): Promise<Float32Array> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    console.log(`📡 Calling OpenAI API for embedding generation...`);

    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: OPENAI_MODEL,
        input: text,
        encoding_format: 'float',
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    // Extract embedding from response
    const embedding = response.data.data[0].embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error('No embedding returned from OpenAI API');
    }

    console.log(`✅ Generated embedding: ${embedding.length} dimensions`);

    return new Float32Array(embedding);
  } catch (error) {
    console.error('❌ Error generating OpenAI embedding:', error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

/**
 * Generate embeddings for multiple texts
 * 
 * @param texts - Array of texts to embed
 * @returns Array of Float32Arrays with 1536 dimensions each
 */
export async function generateBatchOpenAIEmbeddings(texts: string[]): Promise<Float32Array[]> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    console.log(`📡 Calling OpenAI API for batch embedding (${texts.length} texts)...`);

    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: OPENAI_MODEL,
        input: texts,
        encoding_format: 'float',
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    // Response contains array of embeddings in order
    const embeddings = response.data.data.map((item: any) => new Float32Array(item.embedding));

    console.log(`✅ Generated ${embeddings.length} embeddings`);

    return embeddings;
  } catch (error) {
    console.error('❌ Error generating batch OpenAI embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error}`);
  }
}

/**
 * Test embedding generation
 * 
 * @returns Test embedding response
 */
export async function testOpenAIEmbedding(): Promise<OpenAIEmbeddingResponse> {
  try {
    const testText = 'This is a test embedding from OpenAI';
    const embedding = await generateOpenAIEmbedding(testText);

    return {
      embedding: Array.from(embedding),
      model: OPENAI_MODEL,
      dimension: embedding.length,
      usage: {
        prompt_tokens: testText.split(' ').length,
      },
    };
  } catch (error) {
    console.error('❌ Error in test embedding:', error);
    throw new Error(`Test embedding failed: ${error}`);
  }
}

/**
 * Convert Float32Array to Binary for MongoDB storage
 * Used for text_documents and images collections
 * NOT used for MongoDB Atlas sample dataset (pre-embedded)
 */
export function convertEmbeddingToBinary(embedding: Float32Array): Buffer {
  const buffer = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
  return buffer;
}

/**
 * Verify embedding dimensions
 * MongoDB Atlas sample movies expect 1536 dimensions
 */
export function verifyEmbeddingDimension(embedding: Float32Array, expectedDim: number = 1536): boolean {
  if (embedding.length !== expectedDim) {
    console.error(
      `❌ Dimension mismatch! Expected ${expectedDim}, got ${embedding.length}`
    );
    return false;
  }
  return true;
}

/**
 * Get embedding statistics for debugging
 */
export function getEmbeddingStats(embedding: Float32Array) {
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