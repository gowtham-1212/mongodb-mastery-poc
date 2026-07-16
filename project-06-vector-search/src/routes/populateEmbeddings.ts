import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/database';
import {
  generateHuggingFaceEmbedding,
  generateBatchHuggingFaceEmbeddings,
  HUGGINGFACE_MODELS,
  getAvailableModels,
} from '../services/huggingface';
import { generateOpenAIEmbedding } from '../services/openai';

const router = Router();

/**
 * Populate embeddings for all documents in embedded_movies collection
 * POST /api/vector/embeddings/populate
 *
 * This route generates and stores embeddings for all movies in the collection
 * 
 * Query Parameters:
 * - model: 'minilm' | 'mpnet' | 'minilm_l12' | 'openai' (default: 'minilm')
 * - batch_size: number of docs to process at once (default: 10)
 * - skip: number of docs to skip (default: 0)
 * - limit: max docs to process (default: 0 = all)
 *
 * Example:
 * POST /api/vector/embeddings/populate?model=minilm&batch_size=20&limit=100
 */
router.post('/populate', async (req: Request, res: Response) => {
  try {
    const { model = 'minilm', batch_size = 10, skip = 0, limit = 0 } = req.query;
    
    const modelName = String(model).toLowerCase();
    const batchSize = Number(batch_size);
    const skipDocs = Number(skip);
    const limitDocs = Number(limit);

    console.log(`\n📊 Populate Embeddings Route`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Model: ${modelName}`);
    console.log(`Batch Size: ${batchSize}`);
    console.log(`Skip: ${skipDocs}`);
    console.log(`Limit: ${limitDocs || 'All'}`);

    // Validate model
    const allModels = ['minilm', 'mpnet', 'minilm_l12', 'openai'];
    if (!allModels.includes(modelName)) {
      return res.status(400).json({
        error: `Invalid model: ${modelName}. Available: ${allModels.join(', ')}`,
      });
    }

    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    // Get total document count
    const totalDocs = await collection.countDocuments();
    console.log(`\n📈 Collection Stats`);
    console.log(`   Total documents: ${totalDocs}`);

    // Build query for documents to process
    let query: any = {};
    
    // Determine which field to check for existing embeddings
    let embeddingFieldName = '';
    if (modelName === 'openai') {
      embeddingFieldName = 'plot_embedding';
    } else {
      const modelConfig = HUGGINGFACE_MODELS[modelName];
      embeddingFieldName = modelConfig.dbFieldName;
    }

    // Get documents without embeddings or force update
    query[embeddingFieldName] = { $exists: false };
    
    let cursor = collection.find(query).skip(skipDocs);
    
    if (limitDocs > 0) {
      cursor = cursor.limit(limitDocs);
    }

    const docsToProcess = await cursor.toArray();
    console.log(`   Documents to process: ${docsToProcess.length}`);
    console.log(`   Embedding field: ${embeddingFieldName}`);

    if (docsToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'No documents need embedding updates',
        model: modelName,
        documents_processed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Process in batches
    const processedDocs: any[] = [];
    const failedDocs: any[] = [];
    let totalProcessed = 0;

    console.log(`\n⚙️  Processing documents in batches of ${batchSize}...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    for (let i = 0; i < docsToProcess.length; i += batchSize) {
      const batch = docsToProcess.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(docsToProcess.length / batchSize);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} docs)`);

      try {
        if (modelName === 'openai') {
          // Process with OpenAI
          for (const doc of batch) {
            try {
              console.log(`   → Processing: ${doc.title}`);
              
              const embedding = await generateOpenAIEmbedding(doc.plot || '');
              
              // Update document with embedding
              const updateResult = await collection.updateOne(
                { _id: doc._id },
                {
                  $set: {
                    [embeddingFieldName]: embedding,
                    plot_embedding_updated_at: new Date(),
                    plot_embedding_model: 'openai_text-embedding-3-small',
                  },
                },
              );

              if (updateResult.modifiedCount > 0) {
                processedDocs.push({
                  _id: doc._id.toString(),
                  title: doc.title,
                  status: 'success',
                });
                totalProcessed++;
                console.log(`     ✅ Updated`);
              }
            } catch (error) {
              failedDocs.push({
                _id: doc._id.toString(),
                title: doc.title,
                error: String(error),
              });
              console.log(`     ❌ Failed: ${error}`);
            }
          }
        } else {
          // Process with Hugging Face
          const plots = batch.map((doc) => doc.plot || '');
          
          try {
            console.log(`   → Generating ${plots.length} embeddings...`);
            const embeddings = await generateBatchHuggingFaceEmbeddings(plots, modelName);

            // Update all documents in batch
            console.log(`   → Updating documents...`);
            for (let j = 0; j < batch.length; j++) {
              const doc = batch[j];
              const embedding = embeddings[j];

              try {
                const updateResult = await collection.updateOne(
                  { _id: doc._id },
                  {
                    $set: {
                      [embeddingFieldName]: embedding,
                      plot_embedding_updated_at: new Date(),
                      plot_embedding_model: `huggingface_${modelName}`,
                    },
                  },
                );

                if (updateResult.modifiedCount > 0) {
                  processedDocs.push({
                    _id: doc._id.toString(),
                    title: doc.title,
                    status: 'success',
                  });
                  totalProcessed++;
                }
              } catch (error) {
                failedDocs.push({
                  _id: doc._id.toString(),
                  title: doc.title,
                  error: String(error),
                });
              }
            }
            console.log(`     ✅ Updated ${batch.length} documents`);
          } catch (error) {
            console.log(`     ❌ Batch failed: ${error}`);
            failedDocs.push(
              ...batch.map((doc) => ({
                _id: doc._id.toString(),
                title: doc.title,
                error: String(error),
              })),
            );
          }
        }
      } catch (error) {
        console.log(`   ❌ Batch processing error: ${error}`);
      }

      // Progress update
      const progressPercent = ((i + batchSize) / docsToProcess.length * 100).toFixed(1);
      console.log(`   Progress: ${progressPercent}% (${Math.min(i + batchSize, docsToProcess.length)}/${docsToProcess.length})`);
    }

    console.log(`\n📊 Processing Summary`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Successfully processed: ${totalProcessed}`);
    console.log(`❌ Failed: ${failedDocs.length}`);
    console.log(`Model: ${modelName}`);
    console.log(`Field updated: ${embeddingFieldName}`);

    return res.json({
      success: true,
      message: 'Embedding population completed',
      model: modelName,
      embedding_field: embeddingFieldName,
      statistics: {
        total_documents_in_collection: totalDocs,
        documents_processed: totalProcessed,
        documents_failed: failedDocs.length,
        success_rate: ((totalProcessed / docsToProcess.length) * 100).toFixed(2) + '%',
      },
      processed: processedDocs.slice(0, 10), // Show first 10
      processed_count: processedDocs.length,
      failed: failedDocs.slice(0, 10), // Show first 10 failures
      failed_count: failedDocs.length,
      note: failedDocs.length > 0 ? `Showing first 10 failures. Check logs for all ${failedDocs.length} failures.` : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Populate embeddings error:', error);
    res.status(500).json({
      success: false,
      error: `Population failed: ${error}`,
    });
  }
});

/**
 * Check embedding status of collection
 * GET /api/vector/embeddings/status
 *
 * Shows how many documents have embeddings for each model
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    console.log(`\n📊 Checking embedding status...`);

    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    const totalDocs = await collection.countDocuments();

    // Count documents for each embedding model
    const embeddingStats: any = {};

    // OpenAI embedding
    embeddingStats.openai = await collection.countDocuments({
      plot_embedding: { $exists: true },
    });

    // Hugging Face models
    for (const [key, config] of Object.entries(HUGGINGFACE_MODELS)) {
      const fieldName = (config as any).dbFieldName;
      const count = await collection.countDocuments({
        [fieldName]: { $exists: true },
      });
      embeddingStats[key] = count;
    }

    console.log(`✅ Status retrieved`);

    return res.json({
      success: true,
      collection: 'embedded_movies',
      total_documents: totalDocs,
      embedding_status: {
        openai: {
          field: 'plot_embedding',
          documents_with_embedding: embeddingStats.openai,
          documents_without_embedding: totalDocs - embeddingStats.openai,
          coverage: ((embeddingStats.openai / totalDocs) * 100).toFixed(2) + '%',
        },
        huggingface_minilm: {
          field: HUGGINGFACE_MODELS.minilm.dbFieldName,
          documents_with_embedding: embeddingStats.minilm,
          documents_without_embedding: totalDocs - embeddingStats.minilm,
          coverage: ((embeddingStats.minilm / totalDocs) * 100).toFixed(2) + '%',
        },
        huggingface_mpnet: {
          field: HUGGINGFACE_MODELS.mpnet.dbFieldName,
          documents_with_embedding: embeddingStats.mpnet,
          documents_without_embedding: totalDocs - embeddingStats.mpnet,
          coverage: ((embeddingStats.mpnet / totalDocs) * 100).toFixed(2) + '%',
        },
        huggingface_minilm_l12: {
          field: HUGGINGFACE_MODELS.minilm_l12.dbFieldName,
          documents_with_embedding: embeddingStats.minilm_l12,
          documents_without_embedding: totalDocs - embeddingStats.minilm_l12,
          coverage: ((embeddingStats.minilm_l12 / totalDocs) * 100).toFixed(2) + '%',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      error: `Status check failed: ${error}`,
    });
  }
});

/**
 * Populate embeddings for a specific model for ALL documents
 * POST /api/vector/embeddings/populate-all
 *
 * Force repopulates embeddings for all documents, even if they already exist
 */
router.post('/populate-all', async (req: Request, res: Response) => {
  try {
    const { model = 'minilm', batch_size = 10, dry_run = false } = req.query;

    const modelName = String(model).toLowerCase();
    const batchSize = Number(batch_size);
    const isDryRun = dry_run === 'true';

    console.log(`\n🔄 Populate ALL Documents with Embeddings`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Model: ${modelName}`);
    console.log(`Batch Size: ${batchSize}`);
    console.log(`Dry Run: ${isDryRun}`);

    // Validate model
    const allModels = ['minilm', 'mpnet', 'minilm_l12', 'openai'];
    if (!allModels.includes(modelName)) {
      return res.status(400).json({
        error: `Invalid model: ${modelName}. Available: ${allModels.join(', ')}`,
      });
    }

    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    // Get all documents
    let embeddingFieldName = '';
    if (modelName === 'openai') {
      embeddingFieldName = 'plot_embedding';
    } else {
      const modelConfig = HUGGINGFACE_MODELS[modelName];
      embeddingFieldName = modelConfig.dbFieldName;
    }

    const allDocs = await collection.find({}).toArray();
    console.log(`\n📈 Found ${allDocs.length} documents to process`);

    if (isDryRun) {
      console.log(`\n🧪 DRY RUN MODE - No updates will be made`);
      return res.json({
        success: true,
        message: 'Dry run completed - no changes made',
        model: modelName,
        dry_run: true,
        documents_that_would_be_updated: allDocs.length,
        timestamp: new Date().toISOString(),
      });
    }

    let totalUpdated = 0;
    let totalFailed = 0;

    console.log(`\n⚙️  Processing all documents...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Process in batches
    for (let i = 0; i < allDocs.length; i += batchSize) {
      const batch = allDocs.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allDocs.length / batchSize);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches}`);

      try {
        if (modelName === 'openai') {
          // OpenAI processing
          for (const doc of batch) {
            try {
              const embedding = await generateOpenAIEmbedding(doc.plot || '');
              await collection.updateOne(
                { _id: doc._id },
                {
                  $set: {
                    [embeddingFieldName]: embedding,
                    plot_embedding_updated_at: new Date(),
                    plot_embedding_model: 'openai_text-embedding-3-small',
                  },
                },
              );
              totalUpdated++;
            } catch (error) {
              totalFailed++;
            }
          }
        } else {
          // Hugging Face processing
          const plots = batch.map((doc) => doc.plot || '');
          const embeddings = await generateBatchHuggingFaceEmbeddings(plots, modelName);

          for (let j = 0; j < batch.length; j++) {
            try {
              await collection.updateOne(
                { _id: batch[j]._id },
                {
                  $set: {
                    [embeddingFieldName]: embeddings[j],
                    plot_embedding_updated_at: new Date(),
                    plot_embedding_model: `huggingface_${modelName}`,
                  },
                },
              );
              totalUpdated++;
            } catch (error) {
              totalFailed++;
            }
          }
        }

        const progressPercent = ((i + batchSize) / allDocs.length * 100).toFixed(1);
        console.log(`   ✅ Progress: ${progressPercent}% (${Math.min(i + batchSize, allDocs.length)}/${allDocs.length})`);
      } catch (error) {
        console.log(`   ❌ Batch error: ${error}`);
      }
    }

    console.log(`\n✅ Completed!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return res.json({
      success: true,
      message: 'All documents updated with embeddings',
      model: modelName,
      embedding_field: embeddingFieldName,
      statistics: {
        total_documents_processed: totalUpdated + totalFailed,
        successfully_updated: totalUpdated,
        failed: totalFailed,
        success_rate: ((totalUpdated / (totalUpdated + totalFailed)) * 100).toFixed(2) + '%',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Populate all error:', error);
    res.status(500).json({
      success: false,
      error: `Populate all failed: ${error}`,
    });
  }
});

/**
 * Verify embeddings in collection
 * GET /api/vector/embeddings/verify
 *
 * Checks if embeddings are properly formatted
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const { model = 'minilm', sample_size = 5 } = req.query;

    const modelName = String(model).toLowerCase();
    const sampleSize = Number(sample_size);

    console.log(`\n🔍 Verifying embeddings for model: ${modelName}`);

    const db = getDatabase();
    const collection = db.collection('embedded_movies');

    let embeddingFieldName = '';
    let expectedDimensions = 0;

    if (modelName === 'openai') {
      embeddingFieldName = 'plot_embedding';
      expectedDimensions = 1536;
    } else {
      const modelConfig = HUGGINGFACE_MODELS[modelName];
      if (!modelConfig) {
        return res.status(400).json({
          error: `Invalid model: ${modelName}`,
        });
      }
      embeddingFieldName = modelConfig.dbFieldName;
      expectedDimensions = modelConfig.dimensions;
    }

    // Get sample documents with embeddings
    const samples = await collection
      .find({ [embeddingFieldName]: { $exists: true } })
      .limit(sampleSize)
      .toArray();

    if (samples.length === 0) {
      return res.json({
        success: true,
        message: 'No embeddings found for verification',
        model: modelName,
        field: embeddingFieldName,
        samples_found: 0,
      });
    }

    // Verify each sample
    const verificationResults = samples.map((doc: any) => {
      const embedding = doc[embeddingFieldName];
      let dimensionCheck = 'N/A';
      let typeCheck = 'N/A';

      if (Buffer.isBuffer(embedding)) {
        typeCheck = 'Buffer (MongoDB Binary)';
        // Binary embeddings store as 4 bytes per float32
        const dimensions = embedding.length / 4;
        dimensionCheck = dimensions === expectedDimensions ? '✅ Correct' : `❌ Expected ${expectedDimensions}, got ${dimensions}`;
      } else if (Array.isArray(embedding)) {
        typeCheck = 'Array';
        dimensionCheck = embedding.length === expectedDimensions ? '✅ Correct' : `❌ Expected ${expectedDimensions}, got ${embedding.length}`;
      } else if (embedding instanceof Float32Array) {
        typeCheck = 'Float32Array';
        dimensionCheck = embedding.length === expectedDimensions ? '✅ Correct' : `❌ Expected ${expectedDimensions}, got ${embedding.length}`;
      }

      return {
        title: doc.title,
        embedding_type: typeCheck,
        dimensions: dimensionCheck,
        embedding_exists: true,
      };
    });

    return res.json({
      success: true,
      message: 'Embedding verification completed',
      model: modelName,
      field: embeddingFieldName,
      expected_dimensions: expectedDimensions,
      samples_verified: verificationResults.length,
      verification_results: verificationResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({
      success: false,
      error: `Verification failed: ${error}`,
    });
  }
});

export default router;