import express, { Request, Response } from 'express';
import { qdrant } from '../config/qdrantClient';
import { getTextEmbedding } from '../services/textEmbeddingService';

const router = express.Router();

// Insert product
router.post('/products', async (req: Request, res: Response) => {
  try {
    const { id, description, category, price } = req.body;
    const vector = await getTextEmbedding(description);

    await qdrant.upsert('products_text', {
      wait: true,
      points: [{ id, vector, payload: { description, category, price, in_stock: true } }],
    });

    res.json({ message: `Product ${id} stored successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search by Vector using payload: { filterDescription: "heelo" }
router.post('/products/search-by-vector', async (req: Request, res: Response) => {
  try {
    const { filterDescription, category } = req.body;

    if (!filterDescription) {
      return res.status(400).json({ error: 'Payload must contain filterDescription field.' });
    }

    // 1. Convert string to high-dimensional math vector
    const queryVector = await getTextEmbedding(filterDescription);

    // 2. Build ANN query
    const searchParams: any = {
      vector: queryVector,
      limit: 3,
      with_payload: true,
    };

    if (category) {
      searchParams.filter = {
        must: [{ key: 'category', match: { value: category } }],
      };
    }

    // 3. Execute Vector ANN Search
    const results = await qdrant.search('products_text', searchParams);

    res.json({
      query: filterDescription,
      vectorLength: queryVector.length,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/products/:id/stock', async (req: Request, res: Response) => {
    const { in_stock } = req.body;
    await qdrant.setPayload('products_text', {
        points: [Number.parseInt(req.params.id)],
        payload: { in_stock },
        wait: true
    });
    res.json({ message: `Product ${req.params.id} stock updated.` });
});

router.delete('/products/:id', async (req: Request, res: Response) => {
    await qdrant.delete('products_text', {
        points: [Number.parseInt(req.params.id)],
        wait: true
    });
    res.json({ message: `Product ${req.params.id} deleted.` });
});

export default router;