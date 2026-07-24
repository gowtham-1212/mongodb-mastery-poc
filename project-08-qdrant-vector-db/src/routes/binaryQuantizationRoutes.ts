import express, { Request, Response } from 'express';
import { qdrant } from '../config/qdrantClient';
import { getTextEmbedding } from '../services/textEmbeddingService';

const router = express.Router();
const COLLECTION = 'quant_binary';

router.post('/binary/insert', async (req: Request, res: Response) => {
  try {
    const { id, text } = req.body;
    const vector = await getTextEmbedding(text);

    await qdrant.upsert(COLLECTION, {
      wait: true,
      points: [{ id: parseInt(id, 10), vector, payload: { text } }]
    });
    res.json({ message: `Binary Point ${id} inserted.` });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/binary/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const queryVector = await getTextEmbedding(query);

    const results = await qdrant.search(COLLECTION, {
      vector: queryVector, 
      limit: 3, 
      with_payload: true,
      // ADVANCED: Tell Qdrant to oversample the binary graph by 3x, then rescore using original vectors!
      params: { quantization: { ignore: false, rescore: true, oversampling: 3 } }
    });
    res.json({ query, results });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET STATS to confirm 1-bit compression
router.get('/binary/stats', async (req: Request, res: Response) => {
  try {
    const info = await qdrant.getCollection(COLLECTION);
    res.json({
      message: "Check config.quantization_config to verify 1-bit Binary compression is active.",
      points_count: info.points_count,
      config: info.config
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;