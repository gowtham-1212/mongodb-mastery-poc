import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/database';
import { generateTextEmbedding, convertEmbeddingToBinary } from '../services/embeddings';
import type { ITextDocument } from '../models';

const router = Router();

/**
 * Text-to-Text Vector Search
 * POST /api/vector/text-to-text
 * Query similar documents by text description
 */
router.post('/text-to-text', async (req: Request, res: Response) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    // Generate embedding for query text
    console.log(`🔍 Generating embedding for query: "${query}"`);
    const queryEmbedding = await generateTextEmbedding(query);

    // Vector search in MongoDB
    const db = getDatabase();
    const collection = db.collection<ITextDocument>('text_documents');

    const results = await collection
      .aggregate([
        {
         $vectorSearch: {
            index: 'vector_t_t_index', // The exact name of the index you created in the Atlas UI
            path: 'embedding', // The document field we are searching against
            queryVector: Array.from(queryEmbedding), // The mathematical array we generated above
            numCandidates: 100, // Look at the 100 closest matches in RAM (tunes performance)
            limit: limit, // Only pass the top X matches to the next pipeline stage
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray();

    console.log(`✅ Found ${results.length} similar documents`);

    return res.json({
      query,
      embeddings: {
        dimension: queryEmbedding.length,
        sample: Array.from(queryEmbedding.slice(0, 5)),
      },
      results: results.map((doc: any) => ({
        _id: doc._id,
        title: doc.title,
        content: doc.content,
        similarity_score: (doc.score * 100).toFixed(2) + '%',
      })),
      count: results.length,
    });
  } catch (error) {
    console.error('Text-to-Text search error:', error);
    res.status(500).json({ error: `Text-to-Text search failed: ${error}` });
  }
});

/**
 * Add text document with embedding
 * POST /api/vector/text-to-text/add
 */
router.post('/text-to-text/add', async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Generate embedding locally (no API)
    console.log(`📝 Generating embedding for: "${title}"`);
    const embedding = await generateTextEmbedding(content);
    console.log("embedding>>>>", embedding)

    // 2. Convert it to a plain JavaScript array (The Bulletproof Bypass)
    // const embeddingBuffer = convertEmbeddingToBinary(embedding);
    // console.log("embeddingBuffer>>>>", embeddingBuffer)

    const embeddingArray = Array.from(embedding);
    console.log("embeddingArray>>>>", embeddingArray)

    // Save to MongoDB
    const db = getDatabase();
    const collection = db.collection<ITextDocument>('text_documents');

    const document: ITextDocument = {
      title,
      content,
      embedding: embeddingArray,
      created_at: new Date(),
    };

    const result = await collection.insertOne(document);

    console.log(`✅ Document added: ${result.insertedId}`);

    return res.status(201).json({
      message: 'Document added successfully',
      document_id: result.insertedId,
      embedding_dimension: embedding.length,
      embedding_provider: 'Local (Xenova/all-MiniLM-L6-v2)',
    });
  } catch (error) {
    console.error('Add document error:', error);
    res.status(500).json({ error: `Failed to add document: ${error}` });
  }
});

/**
 * Search with filters
 * POST /api/vector/text-to-text/search-with-filters
 *
 * Body:
 * {
 *   "query": "search query",
 *   "limit": 5,
 *   "filters": {
 *     "title": "regex pattern",
 *     "created_after": "2024-01-01"
 *   }
 * }
 */
router.post('/text-to-text/search-with-filters', async (req: Request, res: Response) => {
  try {
    const { query, limit = 5, filters = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    console.log(`\n🔍 Vector Search with Filters`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Query: "${query}"`);
    console.log(`   Filters: ${JSON.stringify(filters)}`);

    // Generate query embedding
    const queryEmbedding = await generateTextEmbedding(query);

    const db = getDatabase();
    const collection = db.collection<ITextDocument>('text_documents');

    // Build aggregation pipeline
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'vector_t_t_index', // The exact name of the index you created in the Atlas UI
          path: 'embedding', // The document field we are searching against
          queryVector: Array.from(queryEmbedding), // The mathematical array we generated above
          numCandidates: 100, // Look at the 100 closest matches in RAM (tunes performance)
          limit: limit, // Only pass the top X matches to the next pipeline stage
        },
      },
    ];

    // Add filter stage
    if (Object.keys(filters).length > 0) {
      const matchStage: any = { $match: {} };

      if (filters.title) {
        matchStage.$match.title = { $regex: filters.title, $options: 'i' };
      }

      if (filters.created_after) {
        matchStage.$match.created_at = { $gte: new Date(filters.created_after) };
      }

      if (filters.created_before) {
        matchStage.$match.created_at = { ...matchStage.$match.created_at, $lte: new Date(filters.created_before) };
      }

      if (Object.keys(matchStage.$match).length > 0) {
        pipeline.push(matchStage);
      }
    }

    // Add projection and limit
    pipeline.push(
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          created_at: 1,
          score: { $meta: 'searchScore' },
        },
      },
      { $limit: limit },
    );

    const results = await collection.aggregate(pipeline).toArray();

    return res.json({
      success: true,
      query,
      filters_applied: Object.keys(filters).length > 0,
      filters,
      results: results.map((doc: any, index: number) => ({
        rank: index + 1,
        _id: doc._id,
        title: doc.title,
        content: doc.content.substring(0, 100) + '...',
        created_at: doc.created_at,
        similarity_score: (doc.score * 100).toFixed(2) + '%',
      })),
      count: results.length,
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      error: `Search failed: ${error}`,
    });
  }
});

export default router;