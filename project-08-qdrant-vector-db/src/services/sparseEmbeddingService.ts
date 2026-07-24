/**
 * A lightweight helper to simulate Sparse Vector generation (like BM25 or SPLADE).
 * It hashes words into integer indices and counts their frequencies (values).
 */
export function getSparseEmbedding(text: string) {
  // Convert text to lowercase and split into words
  const words = text.toLowerCase().match(/\w+/g) || [];
  const frequencies: Record<number, number> = {};

  for (const word of words) {
    // Simple hash function to convert a word into a unique index (0 - 10000)
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % 10000;
    
    // Increment the frequency value for this word index
    frequencies[index] = (frequencies[index] || 0) + 1.0;
  }

  return {
    indices: Object.keys(frequencies).map(Number),
    values: Object.values(frequencies)
  };
}