import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/database';
import {generateLocalEmbedding} from "../services/localEmbeddings"
import { uploadImageAndExtractTags } from '../services/cloudinary';
import multer from 'multer';
import axios from 'axios';

const router = Router();

/**
 * Route 1: Add a target text document
 * POST /api/vector/image-to-text/add
 */
router.post('/image-to-text/add', async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    console.log(`📝 Generating embedding for: "${name}"`);
    
    // Generate embedding using your local Hugging Face model
    const embedding = await generateLocalEmbedding(name);
    const embeddingArray = Array.from(embedding);

    const db = getDatabase();
    const collection = db.collection('text_targets');

    const result = await collection.insertOne({
      name,
      category,
      name_embedding: embeddingArray, // Plain array for the POC
      created_at: new Date(),
    });

    return res.status(201).json({
      message: 'Text target added successfully',
      document_id: result.insertedId,
      name: name
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to add text target: ${error}` });
  }
});

import fs from 'fs';

// 👇 ADD THIS MISSING PIECE 👇
// Configure multer to store uploaded files in a temporary 'uploads' folder
const upload = multer({ dest: 'uploads/' });

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

/**
 * Route 2: Search text documents using an uploaded image
 * POST /api/vector/image-to-text/search
 */
router.post('/image-to-text/search', upload.single('file'), async (req: Request, res: Response) => {
  let uploadedFilePath: string | null = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    uploadedFilePath = req.file.path;
    const { limit = 5 } = req.body;

    console.log(`\n🔍 Starting Image-to-Text Search`);

    // 1. Upload to Cloudinary and get the AI-generated text tags
    const imageData = await uploadImageAndExtractTags(uploadedFilePath);

    console.log("imageData>>>", imageData)
    
    if (imageData.tags.length === 0) {
      throw new Error("Cloudinary could not identify any objects in this image. Ensure Google Auto Tagging is enabled.");
    }

    // 2. Combine the tags into a single descriptive string
    const searchString = imageData.tags.join(' ');
    console.log(`   🧠 AI Extracted Tags: "${searchString}"`);

    // 3. Convert those text tags into a 384-dimension vector!
    const queryEmbedding = await generateLocalEmbedding(searchString);
    const queryEmbeddingArray = Array.from(queryEmbedding);

    // 4. Search MongoDB for the closest text document
    const db = getDatabase();
    const collection = db.collection('text_targets');

    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: 'vector_i_t_index', // Make sure you create this index in Atlas!
            path: 'name_embedding',
            queryVector: queryEmbeddingArray,
            numCandidates: 100,
            limit: Number(limit),
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            category: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray();

    // Clean up temporary file
    if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);

    // Filter for good matches (e.g., > 50% match)
    const confidentResults = results.filter((doc: any) => doc.score > 0.50);

    return res.json({
      extracted_image_context: searchString,
      cloudinary_url: imageData.secure_url,
      results: confidentResults.map((doc: any) => ({
        _id: doc._id,
        name: doc.name,
        similarity_score: (doc.score * 100).toFixed(2) + '%',
      })),
      count: confidentResults.length,
    });

  } catch (error) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    res.status(500).json({ error: `Search failed: ${error}` });
  }
});

/**
 * Image-to-Text Vector Search
 * POST /api/vector/image-to-text
 * Find text descriptions matching an image
 * 
 * Note: This uses URL-based image analysis
 * For production, integrate with computer vision APIs (AWS Rekognition, Google Vision)
 */
// router.post('/image-to-text', async (req: Request, res: Response) => {
//   try {
//     const { imageUrl, limit = 5 } = req.body;

//     if (!imageUrl) {
//       return res.status(400).json({ error: 'Image URL is required' });
//     }

//     // Step 1: Analyze image (simplified - in production use CV API)
//     console.log(`🖼️ Analyzing image for text similarity`);

//     // For demo, extract visual keywords from image URL or metadata
//     const imageKeywords = await analyzeImageVisually(imageUrl);

//     // Step 2: Generate embedding from visual keywords
//     const keywordText = imageKeywords.join(' ');
//     const embedding = await generateTextEmbedding(keywordText);

//     // Step 3: Vector search
//     const db = getDatabase();
//     const collection = db.collection('text_documents');

//     const results = await collection
//       .aggregate([
//         {
//           $search: {
//             cosmicSearch: {
//               vector: Array.from(embedding),
//               path: 'embedding',
//               k: limit,
//             },
//           },
//         },
//         {
//           $project: {
//             _id: 1,
//             title: 1,
//             content: 1,
//             score: { $meta: 'searchScore' },
//           },
//         },
//       ])
//       .limit(limit)
//       .toArray();

//     console.log(`✅ Found ${results.length} matching documents`);

//     return res.json({
//       image_url: imageUrl,
//       detected_keywords: imageKeywords,
//       results: results.map((doc: any) => ({
//         _id: doc._id,
//         title: doc.title,
//         content: doc.content.substring(0, 200) + '...',
//         similarity_score: (doc.score * 100).toFixed(2) + '%',
//       })),
//       count: results.length,
//     });
//   } catch (error) {
//     console.error('Image-to-Text search error:', error);
//     res.status(500).json({ error: `Image-to-Text search failed: ${error}` });
//   }
// });

/**
 * Mock image analysis - extracts keywords from image URL
 * In production, use AWS Rekognition, Google Vision, or Azure Computer Vision
 */
// async function analyzeImageVisually(imageUrl: string): Promise<string[]> {
//   // Placeholder keywords based on URL patterns
//   const keywords = [
//     'visual',
//     'image',
//     'scene',
//     'object',
//     'photo',
//   ];

//   // In production:
//   // const response = await awsRekognition.detectLabels({ Image: { Bytes: imageBuffer } });
//   // return response.Labels.map(l => l.Name);

//   // For demo purposes
//   if (imageUrl.includes('nature')) keywords.push('nature', 'landscape', 'outdoor');
//   if (imageUrl.includes('person')) keywords.push('person', 'human', 'portrait');
//   if (imageUrl.includes('food')) keywords.push('food', 'cuisine', 'meal');
//   if (imageUrl.includes('animal')) keywords.push('animal', 'pet', 'wildlife');

//   return keywords;
// }

export default router;