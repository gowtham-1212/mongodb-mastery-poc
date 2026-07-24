import { env, pipeline, RawImage } from '@xenova/transformers';
import { Binary } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

// Configuration - Allow remote models on first run to download
env.allowLocalModels = true;
env.allowRemoteModels = true; // ✅ Allow downloading on first run
env.cacheDir = path.join(process.cwd(), 'models'); // Store in ./models directory

// Optimize Transformers.js for Node
env.localModelPath = './models';
env.backends.onnx.wasm.numThreads = 1;

class VisionPipeline {
  static instance: any = null;
  
  static async getInstance() {
    if (this.instance === null) {
      console.log('⏳ Loading local CLIP Vision model... (This takes a moment on first run)');
      // The image-feature-extraction pipeline converts pixels into vectors
      this.instance = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
    }
    return this.instance;
  }
}

/**
 * Converts a physical image file into a 512-dimension vector using Sharp + CLIP
 */
export async function generateLocalImageEmbedding(filePath: string): Promise<number[]> {
  // 1. Load the model
  const extractor = await VisionPipeline.getInstance();

  // 2. Use Sharp to read, resize (CLIP expects 224x224), and strip alpha channels
  const image = sharp(filePath)
    .resize(224, 224, { fit: 'cover' })
    .removeAlpha(); // AI models need 3 channels (RGB), not 4 (RGBA)

  // 3. Extract the raw pixel buffers
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  // 4. Wrap it in Xenova's RawImage class
  const rawImage = new RawImage(
    new Uint8ClampedArray(data), 
    info.width, 
    info.height, 
    info.channels
  );

  // 5. Generate the mathematical embedding!
  const output = await extractor(rawImage);
  
  // Return as a plain JavaScript array (512 dimensions)
  return Array.from(output.data);
}

// Ensure models directory exists
const modelsDir = env.cacheDir as string;
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log(`📁 Created models directory: ${modelsDir}`);
}

let extractor: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

/**
 * Initialize the embedding model (lazy loading)
 * Downloads model on first use (~27MB), then caches it locally
 */
async function initializeModel() {
  // If already initialized, return it
  if (extractor) {
    return extractor;
  }

  // If currently initializing, wait for it
  if (isInitializing && initPromise) {
    return initPromise;
  }

  // Start initialization
  isInitializing = true;

  initPromise = (async () => {
    try {
      console.log('\n📥 Loading embedding model...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   Model: Xenova/all-MiniLM-L6-v2');
      console.log('   This runs locally (no API calls)');
      console.log('   First load may take 1-2 minutes (downloading ~27MB)');
      console.log('   Cache directory: ' + modelsDir);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const startTime = Date.now();

      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('✅ Model loaded successfully!');
      console.log(`   Load time: ${loadTime}s`);
      console.log(`   Dimensions: 384`);
      console.log(`   Cache directory: ${modelsDir}\n`);

      return extractor;
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      isInitializing = false;
      initPromise = null;
      throw error;
    }
  })();

  const result = await initPromise;
  isInitializing = false;
  return result;
}

/**
 * Generate embedding locally (no API, no internet required after first run)
 *
 * @param text - Text to embed
 * @returns Float32Array with 384 dimensions
 */
export async function generateLocalEmbedding(text: string): Promise<Float32Array> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    console.log(`📡 Generating local embedding`);
    console.log(`   Text length: ${text.length} chars`);

    // Initialize model if needed
    const model = await initializeModel();

    // Generate embedding
    const output = await model(text, {
      pooling: 'mean',
      normalize: true,
    });


    const embedding = new Float32Array(output.data);

    console.log(`✅ Embedding generated: ${embedding.length} dimensions\n`);

    return embedding;
  } catch (error) {
    console.error('❌ Local embedding error:', error);
    throw new Error(`Failed to generate local embedding: ${error}`);
  }
}

/**
 * Generate embeddings for multiple texts
 *
 * @param texts - Array of texts to embed
 * @returns Array of Float32Arrays
 */
export async function generateLocalBatchEmbeddings(
  texts: string[],
): Promise<Float32Array[]> {
  try {
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    console.log(`📡 Generating ${texts.length} local embeddings`);
    console.log(`   Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)\n`);

    // Initialize model if needed
    const model = await initializeModel();

    // Generate embeddings for all texts
    const embeddings = await Promise.all(
      texts.map(async (text, index) => {
        console.log(`   [${index + 1}/${texts.length}] Processing...`);
        const output = await model(text, {
          pooling: 'mean',
          normalize: true,
        });
        return new Float32Array(output.data);
      }),
    );

    console.log(`✅ Generated ${embeddings.length} embeddings\n`);

    return embeddings;
  } catch (error) {
    console.error('❌ Batch embedding error:', error);
    throw new Error(`Failed to generate batch embeddings: ${error}`);
  }
}

/**
 * Convert Float32Array to MongoDB Binary (SubType 9) for Vector Search
 */
export function convertEmbeddingToBinary(embedding: Float32Array): Binary {
  // 1. Convert the Float32Array into a standard Node.js Buffer
  const buffer = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
  
  // 2. Wrap the Buffer in the MongoDB Binary class and pass '9' as the SubType.
  // SubType 9 tells Atlas: "This is a mathematically optimized Vector array!"
  return new Binary(buffer, 9);
}
/**
 * Convert Buffer back to Float32Array
 */
export function convertBinaryToEmbedding(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

/**
 * Test local embedding generation
 */
export async function testLocalEmbedding() {
  try {
    console.log(`\n🧪 Testing Local Embedding Generation`);
    console.log(`${'='.repeat(60)}\n`);

    const testText = 'This is a test embedding generated locally without any API calls';

    console.log(`Input Text: "${testText}"\n`);

    const embedding = await generateLocalEmbedding(testText);

    const stats = {
      dimensions: embedding.length,
      min: Math.min(...embedding),
      max: Math.max(...embedding),
      mean: Array.from(embedding).reduce((a, b) => a + b) / embedding.length,
      magnitude: Math.sqrt(Array.from(embedding).reduce((a, b) => a + b * b, 0)),
    };

    console.log(`Test Results:`);
    console.log(`   Dimensions: ${stats.dimensions}`);
    console.log(`   Type: Float32Array`);
    console.log(`   Min value: ${stats.min.toFixed(6)}`);
    console.log(`   Max value: ${stats.max.toFixed(6)}`);
    console.log(`   Mean value: ${stats.mean.toFixed(6)}`);
    console.log(`   Magnitude: ${stats.magnitude.toFixed(6)}`);
    console.log(`   First 5 values: [${Array.from(embedding).slice(0, 5).map((v) => v.toFixed(4)).join(', ')}]`);
    console.log(`\n✅ Local embedding test successful!\n`);

    return {
      success: true,
      dimension: embedding.length,
      stats,
      sample: Array.from(embedding.slice(0, 10)),
    };
  } catch (error) {
    console.error(`❌ Test failed:`, error);
    throw error;
  }
}

/**
 * Get model information
 */
export function getModelInfo() {
  return {
    name: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    offline: true,
    cacheDir: modelsDir,
    cacheExists: fs.existsSync(path.join(modelsDir, 'Xenova', 'all-MiniLM-L6-v2')),
    description: 'Sentence transformer model for semantic embeddings',
    license: 'Apache-2.0',
    modelSize: '27MB (approximately)',
  };
}

/**
 * Clear model cache (for development)
 */
export function clearModelCache() {
  try {
    const modelPath = path.join(modelsDir, 'Xenova', 'all-MiniLM-L6-v2');
    if (fs.existsSync(modelPath)) {
      fs.rmSync(modelPath, { recursive: true, force: true });
      console.log(`✅ Model cache cleared: ${modelPath}`);
      extractor = null;
      isInitializing = false;
      initPromise = null;
      return true;
    }
    console.log('ℹ️  Model cache already empty');
    return false;
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
    return false;
  }
}