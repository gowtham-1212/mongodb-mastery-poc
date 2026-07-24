import express, { Request, Response } from 'express';
import { qdrant } from '../config/qdrantClient';
import { getTextEmbedding } from '../services/textEmbeddingService';

const router = express.Router();
const COLLECTION = 'quant_product';

router.post('/product/insert', async (req: Request, res: Response) => {
  try {
    const { id, text } = req.body;
    const vector = await getTextEmbedding(text);

    await qdrant.upsert(COLLECTION, {
      wait: true,
      points: [{ id: parseInt(id, 10), vector, payload: { text } }]
    });
    res.json({ message: `Product Point ${id} inserted.` });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/product/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const queryVector = await getTextEmbedding(query);

    const results = await qdrant.search(COLLECTION, {
      vector: queryVector, limit: 3, with_payload: true
    });
    res.json({ query, results });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET STATS to confirm x16 chunking (Int4 equivalent)
router.get('/product/stats', async (req: Request, res: Response) => {
  try {
    const info = await qdrant.getCollection(COLLECTION);
    res.json({
      message: "Check config.quantization_config to verify Product compression (x16) is active.",
      points_count: info.points_count,
      config: info.config
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;