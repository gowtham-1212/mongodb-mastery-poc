import express, { Request, Response } from 'express';
import { qdrant } from '../config/qdrantClient';
import { getTextEmbedding } from '../services/textEmbeddingService';
import { getSparseEmbedding } from '../services/sparseEmbeddingService';

const router = express.Router();
const COLLECTION = 'hybrid_collection';

// Insert a Point containing BOTH Dense and Sparse vectors
router.post('/hybrid/insert', async (req: Request, res: Response) => {
  try {
    const { id, text } = req.body;
    
    const denseVector = await getTextEmbedding(text);
    const sparseVector = getSparseEmbedding(text);

    await qdrant.upsert(COLLECTION, {
      wait: true,
      points: [{
        id: parseInt(id, 10),
        // Notice we assign vectors to their specific names
        vector: {
          "text_dense": denseVector,
          "text_sparse": sparseVector
        },
        payload: { text }
      }]
    });

    res.json({ message: `Hybrid Point ${id} inserted.` });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Search using ONLY the Dense Vector (Semantic Meaning)
router.post('/hybrid/search-dense', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const queryDenseVector = await getTextEmbedding(query);

    const results = await qdrant.search(COLLECTION, {
      vector: {
        name: "text_dense", 
        vector: queryDenseVector
      },
      limit: 3,
      with_payload: true
    });

    res.json({ query, results });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;