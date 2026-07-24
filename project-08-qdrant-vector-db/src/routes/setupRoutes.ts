import express, { Request, Response } from 'express';
import { qdrant } from '../config/qdrantClient';

const router = express.Router();

// Supported distance metrics: 'Cosine' | 'Dot' | 'Euclid'
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const { distanceMetric = 'Cosine', useCase = 'crud' } = req.body;

    // Validate metric
    const validMetrics = ['Cosine', 'Dot', 'Euclid'];
    if (!validMetrics.includes(distanceMetric)) {
      return res.status(400).json({ error: `Invalid distanceMetric. Must be one of: ${validMetrics.join(', ')}` });
    }

    if(useCase === 'crud'){
        // 1. Setup Text Products Collection (384 dimensions)
        await qdrant.recreateCollection('products_text', {
          vectors: { size: 384, distance: distanceMetric as any },
        });
    
        // Index Payload Field for metadata filtering
        await qdrant.createPayloadIndex('products_text', {
          field_name: 'category',
          field_schema: 'keyword',
          wait: true,
        });
    }

    if(useCase === 'textToImage'){
        // 2. Setup Text-to-Image Collection (512 dimensions for CLIP)
        await qdrant.recreateCollection('text_to_image_collection', {
          vectors: { size: 512, distance: distanceMetric as any },
        });
    }

    if(useCase === 'imageToImage'){
        // 3. Setup Image-to-Image Collection (512 dimensions for CLIP)
        await qdrant.recreateCollection('image_to_image_collection', {
          vectors: { size: 512, distance: distanceMetric as any },
        });
    }


    res.json({
      message: `${useCase} collections created using distance metric: [${distanceMetric}]. Dashboard: http://localhost:6333/dashboard`,
    });

  } catch (err: any) {
    console.error("SETUP ROUTE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Dynamic Quantization Setup Route
router.post('/quantization-setup/:type', async (req: Request, res: Response): Promise<any> => {
  try {
    const { type } = req.params;
    let collectionName = '';
    let quantizationConfig: any = {};

    // Configure specific quantization based on the dynamic parameter
    switch (type.toLowerCase()) {
      case 'scalar':
        collectionName = 'quant_scalar';
        quantizationConfig = {
          scalar: { type: 'int8', always_ram: true } // Converts float32 -> int8 (75% RAM reduction)
        };
        break;
      case 'product':
        collectionName = 'quant_product';
        quantizationConfig = {
          // 'x16' compression groups dimensions, approximating them into 4-bit/8-bit buckets
          product: { compression: 'x16', always_ram: true } // Up to 97% RAM reduction
        };
        break;
      case 'binary':
        collectionName = 'quant_binary';
        quantizationConfig = {
          binary: { always_ram: true } // Converts float32 -> 1-bit (96.8% RAM reduction)
        };
        break;
      default:
        return res.status(400).json({ error: "Invalid type. Use 'scalar', 'product', or 'binary'." });
    }

    // Create the collection with the assigned config
    await qdrant.recreateCollection(collectionName, {
      vectors: { size: 384, distance: 'Dot' }, // Using Dot for performance (vectors are normalized)
      quantization_config: quantizationConfig
    });

    res.json({
      message: `Collection '${collectionName}' created successfully!`,
      appliedConfig: quantizationConfig
    });
  } catch (err: any) {
    console.error("🔥 SETUP ROUTE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Hybrid Search Setup Route (Dense + Sparse)
router.post('/hybrid-setup', async (req: Request, res: Response) => {
  try {
    // Recreate a collection that supports BOTH Dense and Sparse vectors
    await qdrant.recreateCollection('hybrid_collection', {
      vectors: {
        "text_dense": { size: 384, distance: 'Dot' } // The semantic meaning vector
      },
      sparse_vectors: {
        "text_sparse": { } // The exact keyword match vector
      }
    });

    res.json({ message: "Collection 'hybrid_collection' created for Hybrid Search!" });
  } catch (err: any) {
    console.error("🔥 SETUP ROUTE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;