import { Router, Request, Response } from 'express';
import { testLocalEmbedding, getModelInfo, clearModelCache } from '../services/localEmbeddings';

const router = Router();

/**
 * Health check with embedding model info
 * GET /api/vector/health/embeddings
 */
router.get('/health/embeddings', async (req: Request, res: Response) => {
  try {
    console.log('\n🏥 Embedding System Health Check\n');

    const modelInfo = getModelInfo();

    return res.json({
      success: true,
      status: 'healthy',
      embedding_system: {
        type: 'Local (Offline)',
        provider: 'Xenova/Transformers',
        model: modelInfo.name,
        dimensions: modelInfo.dimensions,
        offline: modelInfo.offline,
        cache_directory: modelInfo.cacheDir,
        cache_exists: modelInfo.cacheExists,
        model_size: modelInfo.modelSize,
      },
      features: {
        no_api_calls: true,
        no_network_required_after_first_run: true,
        no_api_keys_needed: true,
        offline_first: true,
      },
      advantages: [
        '✅ Works completely offline (after first run)',
        '✅ No API rate limits',
        '✅ No API costs',
        '✅ Fast processing',
        '✅ Privacy-friendly (data stays local)',
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
    });
  }
});

/**
 * Test embedding generation
 * GET /api/vector/health/test-embedding
 */
router.get('/health/test-embedding', async (req: Request, res: Response) => {
  try {
    const result = await testLocalEmbedding();

    return res.json({
      success: true,
      test_result: result,
      message: 'Embedding generation test successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
    });
  }
});

/**
 * Clear model cache (for development/debugging)
 * DELETE /api/vector/health/clear-cache
 */
router.delete('/health/clear-cache', (req: Request, res: Response) => {
  try {
    console.log('\n🗑️  Clearing model cache...\n');
    const success = clearModelCache();

    return res.json({
      success,
      message: success ? 'Model cache cleared' : 'Cache was already empty',
      note: 'Model will be re-downloaded on next embedding generation',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
    });
  }
});

export default router;