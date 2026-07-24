import fs from 'fs';
import express, { Request, Response } from 'express';
import { getDatabase } from '../config/database';
import { generateLocalEmbedding } from '../services/localEmbeddings';
import { uploadImageAndExtractTags } from '../services/cloudinary';
// Ensure multer is imported and configured at the top of your file
import multer from 'multer'; 

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

// Because CLIP outputs a different shape of math than MiniLM, you must create a new index in Atlas on the clip_images collection.
// Collection: clip_images
// Index Name: clip_vision_index
// JSON
// {
//   "fields": [
//     {
//       "type": "vector",
//       "path": "embedding",
//       "numDimensions": 512,
//       "similarity": "dotProduct"
//     }
//   ]
// }

/**
 * POST /api/vector/clip/add
 * Upload an image, embed via local CPU (CLIP), and save to DB
 */
router.post('/clip/add', upload.single('file'), async (req: Request, res: Response) => {
  let uploadedFilePath: string | null = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'Image file required' });
    uploadedFilePath = req.file.path;
    const { title } = req.body;

    console.log(`\n🖼️ Embedding new image via CLIP: "${title}"`);

    // Extract vector directly from the image file!
    const embeddingArray = await generateLocalImageEmbedding(uploadedFilePath);

    const db = getDatabase(); // Your MongoDB connection logic
    const collection = db.collection('clip_images');

    // Save the file locally so we can view it later, instead of Cloudinary
    const finalFilename = `${Date.now()}-${req.file.originalname}`;
    fs.renameSync(uploadedFilePath, path.join('uploads', finalFilename));

    const result = await collection.insertOne({
      title: title || 'Untitled',
      filename: finalFilename,
      embedding: embeddingArray,
      created_at: new Date()
    });

    return res.status(201).json({
      message: 'Image fully processed offline and embedded',
      id: result.insertedId,
      vector_size: embeddingArray.length // Will be 512
    });

  } catch (error) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/vector/clip/search
 * Find visually similar images using pure multimodal pixel embeddings
 */
router.post('/clip/search', upload.single('file'), async (req: Request, res: Response) => {
  let uploadedFilePath: string | null = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'Query image required' });
    uploadedFilePath = req.file.path;
    const { limit = 5 } = req.body;

    console.log(`\n🔍 Searching via local CLIP Vision...`);

    // Convert query image directly to math
    const queryEmbeddingArray = await generateLocalImageEmbedding(uploadedFilePath);

    const db = getDatabase();
    const collection = db.collection('clip_images');

    const results = await collection.aggregate([
      {
        $vectorSearch: {
          index: 'clip_vision_index', // Make sure you create this 512d index!
          path: 'embedding',
          queryVector: queryEmbeddingArray,
          numCandidates: 100,
          limit: Number(limit)
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          filename: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ]).toArray();

    // Clean up query file
    if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);

    return res.json({
      results: results.map((doc: any) => ({
        ...doc,
        similarity_score: (doc.score * 100).toFixed(2) + '%'
      }))
    });

  } catch (error) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Route: Image-to-Image Search
 * POST /api/vector/image-to-image/search
 * 
 * Form Data:
 * - file: File (required) - The query image you are uploading to search with
 * - limit: number (optional) - Max results to return
 */
router.post('/image-to-image/search', upload.single('file'), async (req: Request, res: Response) => {
  let uploadedFilePath: string | null = null;

  try {
    // 1. Verify the user uploaded a file
    if (!req.file) {
      return res.status(400).json({ error: 'Query image file is required' });
    }

    uploadedFilePath = req.file.path;
    const { limit = 5 } = req.body;

    console.log(`\n🖼️ Starting Image-to-Image Search...`);

    // 2. Upload the query image to Cloudinary and extract the AI context tags
    console.log(`   📤 Analyzing query image...`);
    const queryImageData = await uploadImageAndExtractTags(uploadedFilePath);
    
    if (queryImageData.tags.length === 0) {
      throw new Error("Cloudinary AI could not extract tags from the query image. Ensure Google Auto Tagging is enabled.");
    }

    // 3. Combine the tags into a single "meaning" string
    const searchContext = queryImageData.tags.join(' ');
    console.log(`   🧠 Query Image Meaning: "${searchContext}"`);

    // 4. Convert the query image's meaning into a 384-dimension Vector
    const queryEmbedding = await generateLocalEmbedding(searchContext);
    const queryEmbeddingArray = Array.from(queryEmbedding);

    // 5. Search the existing 'images' collection for mathematically similar vectors
    const db = getDatabase();
    const collection = db.collection('images');

    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: 'vector_t_i_index', // 🔥 CRITICAL: Ensure this matches your Atlas UI index name!
            path: 'embedding',
            queryVector: queryEmbeddingArray,
            numCandidates: 100,
            limit: Number(limit),
          },
        },
        {
          // Shape the output to send back to the frontend
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            cloudinary_url: 1,
            tags: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray();

    // 6. Clean up the local temporary file from your server
    if (fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }

    // 7. Filter for confident matches (drop anything below a 50% similarity match)
    const confidentResults = results.filter((doc: any) => doc.score > 0.50);

    // 8. Return the final payload
    return res.json({
      query_image: {
        url: queryImageData.secure_url,
        extracted_tags: queryImageData.tags,
      },
      results: confidentResults.map((doc: any) => ({
        _id: doc._id,
        title: doc.title,
        matched_image_url: doc.cloudinary_url,
        tags: doc.tags,
        // Convert the raw decimal score into a clean percentage
        similarity_score: (doc.score * 100).toFixed(2) + '%',
      })),
      count: confidentResults.length,
    });

  } catch (error) {
    console.error('❌ Image-to-Image search error:', error);
    
    // Safety cleanup: delete the file if the API crashes midway
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
    
    res.status(500).json({ error: `Image search failed: ${error}` });
  }
});



export default router;