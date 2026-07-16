import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/database';
import {
  generateHuggingFaceEmbedding,
  generateBatchHuggingFaceEmbeddings,
  verifyHuggingFaceDimensions,
  getHuggingFaceEmbeddingStats,
  testHuggingFaceEmbedding,
  HUGGINGFACE_MODELS,
  getAvailableModels,
} from '../services/huggingface';

const router = Router();

/**
 * Search MongoDB Atlas Sample Movies using Hugging Face Embeddings
 * POST /api/vector/huggingface/search
 *
 * Query Parameters:
 * - model: 'minilm' (384 dims) | 'mpnet' (768 dims) | 'minilm_l12' (384 dims)
 * - limit: number of results (default: 10)
 * - query: search text (required)
 *
 * Example:
 * POST /api/vector/huggingface/search
 * {
 *   "query": "space exploration adventure",
 *   "model": "minilm",
 *   "limit": 5
 * }
 */
router.post('/huggingface/search', async (req: Request, res: Response) => {
  try {
    const { query, model = 'minilm', limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const modelConfig = HUGGINGFACE_MODELS[model];
    if (!modelConfig) {
      return res.status(400).json({
        error: `Invalid model: ${model}. Available: ${Object.keys(HUGGINGFACE_MODELS).join(', ')}`,
      });
    }

    console.log(`\n🎬 Hugging Face Vector Search`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Query: "${query}"`);
    console.log(`Model: ${model} (${modelConfig.description})`);
    console.log(`Limit: ${limit}`);

    // Step 1: Generate embedding using Hugging Face
    console.log(`\n📡 Step 1: Generate Query Embedding`);
    const queryEmbedding = await generateHuggingFaceEmbedding(query, model);

    // Verify dimension matches model
    if (!verifyHuggingFaceDimensions(queryEmbedding, modelConfig.dimensions)) {
      return res.status(400).json({
        error: `Embedding dimension mismatch. Expected ${modelConfig.dimensions}, got ${queryEmbedding.length}`,
      });
    }

    const embedStats = getHuggingFaceEmbeddingStats(queryEmbedding);
    console.log(`✅ Embedding generated successfully`);
    console.log(`   Dimensions: ${embedStats.dimension}`);
    console.log(`   Magnitude: ${embedStats.magnitude.toFixed(4)}`);
    console.log(`   Range: [${embedStats.min.toFixed(4)}, ${embedStats.max.toFixed(4)}]`);

    // Step 2: Vector search using MongoDB $search
    console.log(`\n🔍 Step 2: Execute Vector Search`);
    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    // Dynamic field name based on model
    const embeddingFieldName = modelConfig.dbFieldName;
    const indexName = `vector_index_huggingface_${model}`;

    console.log(`   Using field: ${embeddingFieldName}`);
    console.log(`   Using index: ${indexName}`);

    const results = await collection
      .aggregate([
        {
          $search: {
            cosmicSearch: {
              vector: Array.from(queryEmbedding),
              path: embeddingFieldName,
              k: limit,
            },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            year: 1,
            plot: 1,
            genres: 1,
            cast: 1,
            directors: 1,
            runtime: 1,
            imdb: 1,
            score: { $meta: 'searchScore' },
          },
        },
        {
          $limit: limit,
        },
      ])
      .toArray();

    console.log(`✅ Vector search completed`);
    console.log(`   Results found: ${results.length}`);

    // Step 3: Format response
    const formattedResults = results.map((doc: any) => ({
      _id: doc._id.toString(),
      title: doc.title,
      year: doc.year,
      plot: doc.plot ? doc.plot.substring(0, 200) + '...' : 'N/A',
      full_plot: doc.plot,
      genres: doc.genres || [],
      cast: doc.cast?.slice(0, 5) || [],
      directors: doc.directors || [],
      runtime: doc.runtime || 'N/A',
      imdb_rating: doc.imdb?.rating || 'N/A',
      imdb_votes: doc.imdb?.votes || 0,
      similarity_score: doc.score ? (doc.score * 100).toFixed(2) + '%' : 'N/A',
    }));

    console.log(`\n📊 Response Summary`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    formattedResults.forEach((movie: any, idx: number) => {
      console.log(`${idx + 1}. ${movie.title} (${movie.year}) - ${movie.similarity_score}`);
    });

    return res.json({
      success: true,
      search_query: query,
      model_info: {
        provider: 'Hugging Face',
        model_id: modelConfig.modelId,
        model_key: model,
        dimensions: modelConfig.dimensions,
        db_field: embeddingFieldName,
        index_name: indexName,
      },
      embedding_stats: {
        dimension: embedStats.dimension,
        magnitude: embedStats.magnitude.toFixed(4),
        min: embedStats.min.toFixed(6),
        max: embedStats.max.toFixed(6),
        mean: embedStats.mean.toFixed(6),
        sample_first_5: embedStats.sample_first_5,
      },
      results: formattedResults,
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Hugging Face search error:', error);
    res.status(500).json({
      success: false,
      error: `Hugging Face search failed: ${error}`,
    });
  }
});

/**
 * Batch search with multiple queries
 * POST /api/vector/huggingface/batch-search
 *
 * Example:
 * POST /api/vector/huggingface/batch-search
 * {
 *   "queries": ["space movie", "action thriller", "romantic comedy"],
 *   "model": "minilm",
 *   "limit": 3
 * }
 */
router.post('/huggingface/batch-search', async (req: Request, res: Response) => {
  try {
    const { queries = [], model = 'minilm', limit = 5 } = req.body;

    if (!queries || queries.length === 0) {
      return res.status(400).json({ error: 'At least one query is required' });
    }

    const modelConfig = HUGGINGFACE_MODELS[model];
    if (!modelConfig) {
      return res.status(400).json({
        error: `Invalid model: ${model}. Available: ${Object.keys(HUGGINGFACE_MODELS).join(', ')}`,
      });
    }

    console.log(`\n🎬 Batch Hugging Face Vector Search`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Queries: ${queries.length}`);
    console.log(`Model: ${model}`);

    // Generate embeddings for all queries
    console.log(`\n📡 Generating ${queries.length} embeddings...`);
    const queryEmbeddings = await generateBatchHuggingFaceEmbeddings(queries, model);

    console.log(`✅ All embeddings generated`);

    // Perform search for each query
    const db = getDatabase();
    const collection = db.collection('embedded_movies');
    const embeddingFieldName = modelConfig.dbFieldName;

    const batchResults = await Promise.all(
      queryEmbeddings.map(async (embedding, idx) => {
        const results = await collection
          .aggregate([
            {
              $search: {
                cosmicSearch: {
                  vector: Array.from(embedding),
                  path: embeddingFieldName,
                  k: limit,
                },
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                year: 1,
                genres: 1,
                imdb: 1,
                score: { $meta: 'searchScore' },
              },
            },
            {
              $limit: limit,
            },
          ])
          .toArray();

        return {
          query: queries[idx],
          results: results.map((doc: any) => ({
            _id: doc._id.toString(),
            title: doc.title,
            year: doc.year,
            genres: doc.genres || [],
            rating: doc.imdb?.rating || 'N/A',
            similarity: (doc.score * 100).toFixed(2) + '%',
          })),
          count: results.length,
        };
      }),
    );

    return res.json({
      success: true,
      model_info: {
        provider: 'Hugging Face',
        model_id: modelConfig.modelId,
        dimensions: modelConfig.dimensions,
      },
      batch_results: batchResults,
      total_queries: queries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Batch search error:', error);
    res.status(500).json({
      success: false,
      error: `Batch search failed: ${error}`,
    });
  }
});

/**
 * Compare results across different embedding models
 * POST /api/vector/huggingface/compare-models
 *
 * Search using multiple models and compare results
 */
router.post('/huggingface/compare-models', async (req: Request, res: Response) => {
  try {
    const { query, limit = 5, models = ['minilm', 'mpnet'] } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`\n🎬 Compare Embedding Models`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Query: "${query}"`);
    console.log(`Models to compare: ${models.join(', ')}`);

    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    // Generate embeddings for each model
    const comparisonResults = await Promise.all(
      models.map(async (model: string) => {
        try {
          const modelConfig = HUGGINGFACE_MODELS[model];
          if (!modelConfig) {
            return {
              model,
              error: `Invalid model: ${model}`,
              results: [],
            };
          }

          console.log(`\n  Searching with ${model}...`);
          const embedding = await generateHuggingFaceEmbedding(query, model);

          const results = await collection
            .aggregate([
              {
                $search: {
                  cosmicSearch: {
                    vector: Array.from(embedding),
                    path: modelConfig.dbFieldName,
                    k: limit,
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  title: 1,
                  year: 1,
                  score: { $meta: 'searchScore' },
                },
              },
              {
                $limit: limit,
              },
            ])
            .toArray();

          return {
            model,
            modelId: modelConfig.modelId,
            dimensions: modelConfig.dimensions,
            results: results.map((doc: any) => ({
              title: doc.title,
              year: doc.year,
              similarity: (doc.score * 100).toFixed(2) + '%',
            })),
            count: results.length,
          };
        } catch (error) {
          return {
            model,
            error: String(error),
            results: [],
          };
        }
      }),
    );

    console.log(`✅ Model comparison completed`);

    return res.json({
      success: true,
      search_query: query,
      comparison: comparisonResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Model comparison error:', error);
    res.status(500).json({
      success: false,
      error: `Model comparison failed: ${error}`,
    });
  }
});

/**
 * Test Hugging Face embedding
 * GET /api/vector/huggingface/test
 *
 * Query params:
 * - model: 'minilm' | 'mpnet' | 'minilm_l12'
 */
router.get('/huggingface/test', async (req: Request, res: Response) => {
  try {
    const { model = 'minilm' } = req.query;

    console.log(`\n🧪 Testing Hugging Face Model: ${model}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const testResult = await testHuggingFaceEmbedding(model as string);

    const modelConfig = HUGGINGFACE_MODELS[model as string];
    const stats = getHuggingFaceEmbeddingStats(new Float32Array(testResult.embedding));

    console.log(`✅ Test successful`);
    console.log(`   Model: ${testResult.model}`);
    console.log(`   Dimensions: ${testResult.dimension}`);

    return res.json({
      success: true,
      message: 'Hugging Face embedding generation test successful',
      model_config: {
        key: model,
        modelId: testResult.model,
        dimensions: testResult.dimension,
        dbField: modelConfig?.dbFieldName,
      },
      embedding_sample: testResult.embedding.slice(0, 10),
      full_embedding_count: testResult.embedding.length,
      statistics: {
        min: stats.min.toFixed(6),
        max: stats.max.toFixed(6),
        mean: stats.mean.toFixed(6),
        magnitude: stats.magnitude.toFixed(4),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      error: `Test failed: ${error}`,
    });
  }
});

/**
 * Get available Hugging Face models
 * GET /api/vector/huggingface/models
 */
router.get('/huggingface/models', (req: Request, res: Response) => {
  try {
    console.log(`\n📋 Fetching available Hugging Face models...`);

    const models = getAvailableModels();

    console.log(`✅ Retrieved ${models.length} models`);

    return res.json({
      success: true,
      available_models: models,
      total: models.length,
      note: 'Use model "id" value in API requests',
    });
  } catch (error) {
    console.error('❌ Error fetching models:', error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch models: ${error}`,
    });
  }
});

/**
 * Advanced search with filters using Hugging Face embeddings
 * POST /api/vector/huggingface/advanced-search
 */
router.post('/huggingface/advanced-search', async (req: Request, res: Response) => {
  try {
    const {
      query,
      model = 'minilm',
      year_from = 1900,
      year_to = 2100,
      min_rating = 0,
      genres = [],
      limit = 10,
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const modelConfig = HUGGINGFACE_MODELS[model];
    if (!modelConfig) {
      return res.status(400).json({
        error: `Invalid model: ${model}. Available: ${Object.keys(HUGGINGFACE_MODELS).join(', ')}`,
      });
    }

    console.log(`\n🎬 Advanced Hugging Face Search`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Query: "${query}"`);
    console.log(`Model: ${model}`);
    console.log(`Filters: Year ${year_from}-${year_to}, Rating ≥ ${min_rating}`);
    if (genres.length > 0) console.log(`Genres: ${genres.join(', ')}`);

    // Generate embedding
    const queryEmbedding = await generateHuggingFaceEmbedding(query, model);

    if (!verifyHuggingFaceDimensions(queryEmbedding, modelConfig.dimensions)) {
      return res.status(400).json({
        error: `Dimension mismatch. Expected ${modelConfig.dimensions}, got ${queryEmbedding.length}`,
      });
    }

    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    // Build filter pipeline
    const filterPipeline: any[] = [];

    // Add genre filter
    if (genres.length > 0) {
      filterPipeline.push({
        $match: {
          genres: { $in: genres },
        },
      });
    }

    // Add year and rating filters
    filterPipeline.push({
      $match: {
        year: { $gte: year_from, $lte: year_to },
        'imdb.rating': { $gte: min_rating },
      },
    });

    // Vector search with filters
    const results = await collection
      .aggregate([
        {
          $search: {
            cosmicSearch: {
              vector: Array.from(queryEmbedding),
              path: modelConfig.dbFieldName,
              k: limit,
            },
          },
        },
        ...filterPipeline,
        {
          $project: {
            _id: 1,
            title: 1,
            year: 1,
            plot: 1,
            genres: 1,
            imdb: 1,
            score: { $meta: 'searchScore' },
          },
        },
        { $limit: limit },
      ])
      .toArray();

    console.log(`✅ Advanced search completed: ${results.length} results`);

    return res.json({
      success: true,
      search_query: query,
      model_info: {
        model,
        modelId: modelConfig.modelId,
        dimensions: modelConfig.dimensions,
      },
      filters: {
        year_range: [year_from, year_to],
        min_rating,
        genres,
      },
      results: results.map((doc: any) => ({
        _id: doc._id.toString(),
        title: doc.title,
        year: doc.year,
        plot: doc.plot?.substring(0, 150) + '...',
        genres: doc.genres,
        rating: doc.imdb?.rating,
        similarity_score: (doc.score * 100).toFixed(2) + '%',
      })),
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Advanced search error:', error);
    res.status(500).json({
      success: false,
      error: `Advanced search failed: ${error}`,
    });
  }
});

export default router;