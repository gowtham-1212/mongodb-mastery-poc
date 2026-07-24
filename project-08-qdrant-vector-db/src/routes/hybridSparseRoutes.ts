import express, { Request, Response } from 'express';
import { qdrant } from '../config/qdrantClient';
import { getSparseEmbedding } from '../services/sparseEmbeddingService';
import { getTextEmbedding } from '../services/textEmbeddingService';

const router = express.Router();
const COLLECTION = 'hybrid_collection';

// Search using ONLY the Sparse Vector (Exact Keyword Match)
router.post('/hybrid/search-sparse', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const querySparseVector = getSparseEmbedding(query);

    console.log("querySparseVector", querySparseVector);

    const results = await qdrant.search(COLLECTION, {
      vector: {
        name: "text_sparse",
        vector: querySparseVector
      },
      limit: 3,
      with_payload: true
    });

    res.json({ query, results });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// TRUE HYBRID SEARCH (Combining both models with RRF)
// Note: In Qdrant 1.10+, you use the query API with prefetch for RRF fusion.
// For the REST client, you can execute both and merge, or use the query endpoint.
router.post('/hybrid/search-combined', async (req: Request, res: Response) => {
try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Please provide a 'query' string." });
    }

    // 1. Generate BOTH vectors simultaneously for maximum speed
    const [queryDenseVector, querySparseVector] = await Promise.all([
      getTextEmbedding(query),
      getSparseEmbedding(query) // (This executes synchronously in our mock, but this pattern is best practice)
    ]);

    // 2. Execute Native Hybrid Search using Qdrant's Query API
    const results = await qdrant.query('hybrid_collection', {
      // PREFETCH: Tell Qdrant to run both searches independently first
      prefetch: [
        {
          query: queryDenseVector,
          using: "text_dense",
          limit: 6 // Fetch the top 6 semantic matches
        },
        {
          query: querySparseVector,
          using: "text_sparse",
          limit: 6 // Fetch the top 6 exact keyword matches
        }
      ],
      // QUERY FUSION: Tell Qdrant to merge the two prefetch lists mathematically
      query: {
        fusion: "rrf" 
      },
      limit: 3, // Return the absolute best 3 combined matches to the client
      with_payload: true
    });

    res.json({ query, results });
  } catch (err: any) {
    console.error("🔥 HYBRID SEARCH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;