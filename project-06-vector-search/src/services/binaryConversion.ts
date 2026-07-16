/**
 * 🔧 BINARY CONVERSION PATTERN
 * 
 * This module handles the conversion between:
 * - Float32Array (JavaScript native format)
 * - BSON Binary (MongoDB storage format)
 * 
 * MongoDB Vector Search requires BSON Binary format
 * for efficient storage and retrieval
 */

/**
 * Convert Float32Array embedding to MongoDB Binary format
 * 
 * @param embedding - Float32Array from Hugging Face
 * @returns Buffer in BSON Binary format
 * 
 * Example:
 * const embedding = new Float32Array([0.1, 0.2, 0.3, ...])
 * const binary = convertEmbeddingToBinary(embedding)
 * // Store in MongoDB: { embedding: binary }
 */
export function convertEmbeddingToBinary(embedding: Float32Array): Buffer {
  // Create a buffer from Float32Array's underlying ArrayBuffer
  // This preserves the binary representation exactly
  const buffer = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
  return buffer;
}

/**
 * Convert MongoDB Binary back to Float32Array
 * 
 * @param buffer - Buffer retrieved from MongoDB
 * @returns Float32Array for vector operations
 * 
 * Example:
 * const buffer = doc.embedding  // Retrieved from MongoDB
 * const embedding = convertBinaryToEmbedding(buffer)
 * // embedding is now a Float32Array
 */
export function convertBinaryToEmbedding(buffer: Buffer): Float32Array {
  // Convert buffer back to Float32Array
  // byteOffset and byteLength preserve the exact data
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

/**
 * Verify embedding dimensions after conversion
 * 
 * @param buffer - BSON Binary buffer
 * @param expectedDimension - Expected vector dimension (e.g., 384)
 * @returns true if dimensions match
 */
export function verifyEmbeddingDimensions(buffer: Buffer, expectedDimension: number): boolean {
  const embedding = convertBinaryToEmbedding(buffer);
  return embedding.length === expectedDimension;
}

/**
 * Get embedding statistics for debugging
 */
export function getEmbeddingStats(embedding: Float32Array) {
  return {
    dimension: embedding.length,
    byteLength: embedding.byteLength,
    min: Math.min(...embedding),
    max: Math.max(...embedding),
    mean: Array.from(embedding).reduce((a, b) => a + b) / embedding.length,
    sample: Array.from(embedding.slice(0, 5)),
  };
}

/**
 * Memory layout diagram:
 * 
 * Float32Array (JavaScript):
 * ┌─────────────────────────────────────┐
 * │ [0.1, 0.2, 0.3, ..., 0.384]        │ 384 × 4 bytes = 1536 bytes
 * └─────────────────────────────────────┘
 *          ↓ (convertEmbeddingToBinary)
 * 
 * ArrayBuffer:
 * ┌─────────────────────────────────────┐
 * │ Binary representation                │ 1536 bytes total
 * │ [00111101 10011010 01101000 ...]    │
 * └─────────────────────────────────────┘
 *          ↓ (Buffer.from)
 * 
 * BSON Binary (MongoDB):
 * ┌─────────────────────────────────────┐
 * │ BinData type + 1536 bytes           │
 * │ Stored efficiently in MongoDB       │
 * │ Used for $search vector operations  │
 * └─────────────────────────────────────┘
 *          ↓ (retrieveFromDB)
 * 
 * Buffer (Node.js):
 * ┌─────────────────────────────────────┐
 * │ Binary data as Node.js Buffer       │
 * │ 1536 bytes total                    │
 * └─────────────────────────────────────┘
 *          ↓ (convertBinaryToEmbedding)
 * 
 * Float32Array (JavaScript):
 * ┌─────────────────────────────────────┐
 * │ [0.1, 0.2, 0.3, ..., 0.384]        │ Ready for vector operations
 * └─────────────────────────────────────┘
 */