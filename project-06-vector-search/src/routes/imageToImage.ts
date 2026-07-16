import fs from 'fs';
import express, { Request, Response } from 'express';
import { getDatabase } from '../config/database';
import { generateLocalEmbedding } from '../services/localEmbeddings';
import { uploadImageAndExtractTags } from '../services/cloudinary';
// Ensure multer is imported and configured at the top of your file
import multer from 'multer'; 

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

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