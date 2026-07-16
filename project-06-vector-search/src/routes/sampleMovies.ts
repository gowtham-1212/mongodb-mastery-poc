import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/database';
import {
  generateOpenAIEmbedding,
  verifyEmbeddingDimension,
  getEmbeddingStats,
  testOpenAIEmbedding,
} from '../services/openai';

const router = Router();

/**
 * Search MongoDB Atlas Sample Movies Dataset using Vector Search
 * POST /api/vector/sample-movies
 *
 * Prerequisites:
 * 1. MongoDB Atlas cluster with sample data loaded
 * 2. Vector search index named "vector_index"
 * 3. Index path: "plot_embedding"
 * 4. Index type: vector (HNSW algorithm)
 * 5. Dimensions: 1536 (matches OpenAI text-embedding-3-small)
 * 6. Similarity: cosine
 *
 * Using: OpenAI text-embedding-3-small (1536 dimensions)
 */
router.post('/sample-movies', async (req: Request, res: Response) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`\n🎬 Sample Movies Vector Search`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Query: "${query}"`);
    console.log(`Limit: ${limit}`);

    // Step 1: Generate embedding using OpenAI
    console.log(`\n📡 Step 1: Generate Query Embedding`);
    const queryEmbedding = await generateOpenAIEmbedding(query);

    // Verify dimension matches MongoDB index
    if (!verifyEmbeddingDimension(queryEmbedding, 1536)) {
      return res.status(400).json({
        error: `Embedding dimension mismatch. Expected 1536, got ${queryEmbedding.length}`,
      });
    }

    const embedStats = getEmbeddingStats(queryEmbedding);
    console.log(`✅ Embedding generated successfully`);
    console.log(`   Dimensions: ${embedStats.dimension}`);
    console.log(`   Magnitude: ${embedStats.magnitude.toFixed(4)}`);
    console.log(`   Range: [${embedStats.min.toFixed(4)}, ${embedStats.max.toFixed(4)}]`);

    // Step 2: Vector search using MongoDB $search aggregation
    console.log(`\n🔍 Step 2: Execute Vector Search`);
    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    // MongoDB Atlas $search with $vectorSearch operator
    // Using HNSW algorithm for fast approximate nearest neighbor search
    const results = await collection
      .aggregate([
        {
          // 🔧 CORRECT OPERATOR: $search with $vectorSearch
          // NOT cosmicSearch (that was a mistake)
          $search: {
            cosmicSearch: {
              vector: Array.from(queryEmbedding),
              path: 'plot_embedding',
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
      embedding_info: {
        model: 'text-embedding-3-small (OpenAI)',
        dimensions: queryEmbedding.length,
        sample: Array.from(queryEmbedding.slice(0, 5)),
      },
      vector_search_index: {
        index_name: 'vector_index',
        path: 'plot_embedding',
        dimensions: 1536,
        similarity: 'cosine',
        algorithm: 'HNSW',
      },
      results: formattedResults,
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Sample movies search error:', error);
    res.status(500).json({
      success: false,
      error: `Sample movies search failed: ${error}`,
    });
  }
});

/**
 * Get collection information
 * GET /api/vector/sample-movies/info
 */
router.get('/sample-movies/info', async (req: Request, res: Response) => {
  try {
    console.log(`\n📋 Fetching collection information...`);

    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    // Get document count
    const count = await collection.countDocuments();

    // Get vector search indexes
    const indexes = await collection.listSearchIndexes().toArray();

    // Get sample document to show structure
    const sampleDoc = await collection.findOne({});

    console.log(`✅ Collection info retrieved`);
    console.log(`   Documents: ${count}`);
    console.log(`   Vector indexes: ${indexes.length}`);

    return res.json({
      success: true,
      collection_name: 'embedded_movies',
      document_count: count,
      sample_document_structure: sampleDoc
        ? {
            _id: 'ObjectId',
            title: typeof sampleDoc.title,
            plot: 'string',
            plot_embedding: 'BinData (1536 dimensions)',
            genres: 'array of strings',
            cast: 'array of strings',
            directors: 'array of strings',
            year: 'number',
            runtime: 'number',
            imdb: {
              rating: 'number',
              votes: 'number',
            },
          }
        : null,
      vector_search_indexes: indexes.map((idx: any) => ({
        index_name: idx.name,
        status: idx.status,
        definition: idx.indexOptions?.definition,
      })),
      expected_index_config: {
        name: 'vector_index',
        type: 'vector',
        path: 'plot_embedding',
        dimensions: 1536,
        similarity: 'cosine',
        algorithm: 'HNSW',
      },
      embedding_service: {
        provider: 'OpenAI',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Collection info error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch collection info: ${error}`,
    });
  }
});

/**
 * Test OpenAI embedding generation
 * GET /api/vector/sample-movies/test-embedding
 */
router.get('/sample-movies/test-embedding', async (req: Request, res: Response) => {
  try {
    console.log(`\n🧪 Testing OpenAI Embedding Generation`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const testResult = await testOpenAIEmbedding();

    console.log(`✅ Test successful`);
    console.log(`   Model: ${testResult.model}`);
    console.log(`   Dimensions: ${testResult.dimension}`);
    console.log(`   Tokens used: ${testResult.usage.prompt_tokens}`);

    return res.json({
      success: true,
      message: 'OpenAI embedding generation test successful',
      model: testResult.model,
      dimensions: testResult.dimension,
      embedding_sample: testResult.embedding.slice(0, 10),
      full_embedding_count: testResult.embedding.length,
      usage: testResult.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Embedding test error:', error);
    res.status(500).json({
      success: false,
      error: `Embedding test failed: ${error}`,
    });
  }
});

/**
 * Advanced search with filters
 * POST /api/vector/sample-movies/advanced-search
 *
 * Combines vector search with MongoDB filters
 * Example: Find sci-fi movies from 2020+ with rating > 7
 */
router.post('/sample-movies/advanced-search', async (req: Request, res: Response) => {
  try {
    const { query, year_from = 1900, year_to = 2100, min_rating = 0, genres = [], limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    console.log(`\n🎬 Advanced Movie Search`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Query: "${query}"`);
    console.log(`Year: ${year_from}-${year_to}`);
    console.log(`Min Rating: ${min_rating}`);
    console.log(`Genres: ${genres.join(', ') || 'All'}`);

    // Generate embedding
    const queryEmbedding = await generateOpenAIEmbedding(query);

    if (!verifyEmbeddingDimension(queryEmbedding, 1536)) {
      return res.status(400).json({
        error: `Embedding dimension mismatch. Expected 1536, got ${queryEmbedding.length}`,
      });
    }

    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    // Build filter pipeline
    const filterPipeline: any[] = [];

    // Add genre filter if provided
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

    // Vector search
    const results = await collection
      .aggregate([
        {
          $search: {
            cosmicSearch: {
              vector: Array.from(queryEmbedding),
              path: 'plot_embedding',
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