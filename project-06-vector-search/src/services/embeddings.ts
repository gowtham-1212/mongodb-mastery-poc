import axios from 'axios';
import 'dotenv/config';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const HUGGING_FACE_MODEL = process.env.HUGGING_FACE_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';

// API endpoint with timeout
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimension: number;
}

/**
 * Helper: Sleep for milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper: Verify API connectivity
 */
//  async function checkHuggingFaceConnectivity(): Promise<boolean> {
//   console.log('ℹ️  Using local embeddings - no API connectivity needed\n');
//   return true;
// }

/**
 * Generate text embeddings using Hugging Face API with retry logic
 */
 async function generateTextEmbedding(
  text: string,
  retryCount: number = 0,
): Promise<Float32Array> {
  try {
    if (!HUGGING_FACE_API_KEY) {
      throw new Error('HUGGING_FACE_API_KEY environment variable is not set');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    console.log(`📡 Generating embedding (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    console.log(`   Model: ${HUGGING_FACE_MODEL}`);
    console.log(`   Text length: ${text.length} chars`);

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${HUGGING_FACE_MODEL}`,
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT,
      },
    );

    // Response format: [[embedding_values]]
    const embedding = response.data[0] || [];

    if (!embedding || embedding.length === 0) {
      throw new Error('Empty embedding received from API');
    }

    console.log(`✅ Embedding generated: ${embedding.length} dimensions`);
    return new Float32Array(embedding);
  } catch (error: any) {
    console.error(`❌ Embedding generation error (attempt ${retryCount + 1}):`);

    // Identify error type
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error(`   Network Error: Cannot reach api-inference.huggingface.co`);
      console.error(`   Code: ${error.code}`);
      
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`   ⏳ Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        return generateTextEmbedding(text, retryCount + 1);
      }
      
      throw new Error(
        `Network Error: Cannot reach Hugging Face API after ${MAX_RETRIES} attempts. Check your internet connection or DNS settings.`,
      );
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error(`   Timeout Error: API request exceeded ${API_TIMEOUT}ms`);
      
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`   ⏳ Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        return generateTextEmbedding(text, retryCount + 1);
      }
      
      throw new Error(`API Timeout after ${MAX_RETRIES} attempts`);
    } else if (error.response?.status === 429) {
      console.error(`   Rate Limit Error: Too many requests`);
      const retryAfter = error.response.headers['retry-after'] || RETRY_DELAY / 1000;
      console.log(`   ⏳ Waiting ${retryAfter}s before retry...`);
      await sleep(retryAfter * 1000);
      return generateTextEmbedding(text, retryCount + 1);
    } else if (error.response?.status === 500) {
      console.error(`   Server Error: Hugging Face API error`);
      
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`   ⏳ Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        return generateTextEmbedding(text, retryCount + 1);
      }
    }

    console.error(`   Full Error: ${error.message}`);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts with retry logic
 */
 async function generateBatchEmbeddings(
  texts: string[],
  retryCount: number = 0,
): Promise<Float32Array[]> {
  try {
    if (!HUGGING_FACE_API_KEY) {
      throw new Error('HUGGING_FACE_API_KEY environment variable is not set');
    }

    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    console.log(`📡 Generating batch embeddings (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    console.log(`   Batch size: ${texts.length}`);
    console.log(`   Model: ${HUGGING_FACE_MODEL}`);

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${HUGGING_FACE_MODEL}`,
      { inputs: texts },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT * 2, // Longer timeout for batch requests
      },
    );

    // Response format: [[embeddings], [embeddings], ...]
    const embeddings = response.data.map((embedding: number[]) => new Float32Array(embedding));

    console.log(`✅ Batch embeddings generated: ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error: any) {
    console.error(`❌ Batch embedding generation error (attempt ${retryCount + 1}):`);

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error(`   Network Error: ${error.code}`);

      if (retryCount < MAX_RETRIES - 1) {
        console.log(`   ⏳ Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        return generateBatchEmbeddings(texts, retryCount + 1);
      }

      throw new Error('Network Error: Cannot reach Hugging Face API');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error(`   Timeout Error`);

      if (retryCount < MAX_RETRIES - 1) {
        console.log(`   ⏳ Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        return generateBatchEmbeddings(texts, retryCount + 1);
      }

      throw new Error('API Timeout: Request took too long');
    } else if (error.response?.status === 429) {
      console.error(`   Rate Limit Error`);
      const retryAfter = error.response.headers['retry-after'] || RETRY_DELAY / 1000;
      console.log(`   ⏳ Waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      return generateBatchEmbeddings(texts, retryCount + 1);
    }

    console.error(`   Full Error: ${error.message}`);
    throw new Error(`Failed to generate batch embeddings: ${error.message}`);
  }
}

/**
 * Convert Float32Array to Binary for MongoDB storage
 */
 function convertEmbeddingToBinary(embedding: Float32Array): Buffer {
  const buffer = Buffer.from(embedding.buffer);
  return buffer;
}

/**
 * Convert Binary buffer back to Float32Array
 */
 function convertBinaryToEmbedding(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

/**
 * Test embedding generation with diagnostics
 */
 async function testEmbedding(): Promise<EmbeddingResponse> {
  try {
    // First check connectivity
    const isConnected = await checkHuggingFaceConnectivity();
    if (!isConnected) {
      throw new Error('Hugging Face API is not reachable');
    }

    const text = 'This is a test embedding';
    console.log(`\n🧪 Testing embedding generation...`);
    console.log(`   Text: "${text}"`);

    const embedding = await generateTextEmbedding(text);

    console.log(`✅ Test successful!`);
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   Sample values: [${Array.from(embedding).slice(0, 5).join(', ')}...]`);

    return {
      embedding: Array.from(embedding),
      model: HUGGING_FACE_MODEL,
      dimension: embedding.length,
    };
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    throw error;
  }
}

/**
 * Get API configuration info (for debugging)
 */
 function getEmbeddingConfig() {
  return {
    model: HUGGING_FACE_MODEL,
    api_key_set: !!HUGGING_FACE_API_KEY,
    timeout_ms: API_TIMEOUT,
    max_retries: MAX_RETRIES,
    retry_delay_ms: RETRY_DELAY,
    api_endpoint: 'https://api-inference.huggingface.co',
  };
}

// ⭐ Use local embeddings instead of API
export {
  generateLocalEmbedding as generateTextEmbedding,
  generateLocalBatchEmbeddings as generateBatchEmbeddings,
  convertEmbeddingToBinary,
  convertBinaryToEmbedding,
  testLocalEmbedding as testEmbedding,
  getModelInfo as getEmbeddingConfig,
} from './localEmbeddings';

// Keep old exports for backward compatibility
export async function checkHuggingFaceConnectivity(): Promise<boolean> {
  console.log('ℹ️  Using local embeddings - no API connectivity needed\n');
  return true;
}