import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../config/database';
import { generateTextEmbedding, convertEmbeddingToBinary } from '../services/embeddings';
import { uploadImageToCloudinary } from '../services/cloudinary';
import type { IImage } from '../models';

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Created uploads directory: ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// File filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

/**
 * Text-to-Image Vector Search
 * POST /api/vector/text-to-image
 * Query images by text description
 */
router.post('/text-to-image', async (req: Request, res: Response) => {
  try {
    const { description, limit = 5 } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Image description is required' });
    }

    console.log(`\n🖼️  Text-to-Image Search`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Description: "${description}"`);
    console.log(`   Limit: ${limit}`);

    // Generate embedding for description
    console.log(`\n📡 Generating description embedding...`);
    const descriptionEmbedding = await generateTextEmbedding(description);

    console.log(`   ✅ Embedding generated: ${descriptionEmbedding.length} dimensions`);

    const db = getDatabase();
    const collection = db.collection<IImage>('images');

    console.log(`\n🔎 Searching vector index...`);

    const results = await collection
      .aggregate([
        {
           $vectorSearch: {
            index: 'vector_t_i_index', // The exact name of the index you created in the Atlas UI
            path: 'embedding', // The document field we are searching against
            queryVector: Array.from(descriptionEmbedding), // The mathematical array we generated above
            numCandidates: 100, // Look at the 100 closest matches in RAM (tunes performance)
            limit: limit, // Only pass the top X matches to the next pipeline stage
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            cloudinary_url: 1,
            cloudinary_id: 1,
            tags: 1,
            created_at: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .limit(limit)
      .toArray();

    console.log(`   ✅ Found ${results.length} matching images\n`);

    return res.json({
      success: true,
      search_description: description,
      embedding_dimension: descriptionEmbedding.length,
      results: results.map((doc: any, index: number) => ({
        rank: index + 1,
        _id: doc._id,
        title: doc.title,
        description: doc.description,
        image_url: doc.cloudinary_url,
        tags: doc.tags,
        created_at: doc.created_at,
        similarity_score: (doc.score * 100).toFixed(2) + '%',
        raw_score: doc.score,
      })),
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Text-to-Image search error:', error);
    res.status(500).json({
      success: false,
      error: `Text-to-Image search failed: ${error}`,
    });
  }
});

/**
 * Add image with embedding
 * POST /api/vector/text-to-image/add
 *
 * Form Data:
 * - title: string (required) - Image title
 * - description: string (optional) - Image description
 * - tags: string (optional) - Comma-separated tags
 * - file: File (required) - Image file to upload
 *
 * Example:
 * curl -X POST http://localhost:3021/api/vector/text-to-image/add \
 *   -F "title=My Image" \
 *   -F "description=A beautiful sunset" \
 *   -F "tags=sunset,nature,landscape" \
 *   -F "file=@/path/to/image.jpg"
 */
router.post('/text-to-image/add', upload.single('file'), async (req: Request, res: Response) => {
  let uploadedFilePath: string | null = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Image file is required',
        tips: ['Use form-data in your request', 'File field name must be "file"'],
      });
    }

    const { title, description = '', tags = '' } = req.body;

    // Validate required fields
    if (!title) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Title is required in form data',
        tips: ['Provide "title" field in form-data'],
      });
    }

    uploadedFilePath = req.file.path;

    console.log(`\n📝 Adding New Image with Embedding`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Title: "${title}"`);
    console.log(`   File: ${req.file.originalname}`);
    console.log(`   File size: ${(req.file.size / 1024).toFixed(2)} KB`);
    console.log(`   File type: ${req.file.mimetype}`);

    // Parse tags
    const tagsArray = tags
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0);

    console.log(`   Tags: ${tagsArray.length > 0 ? tagsArray.join(', ') : 'None'}`);

    // Upload to Cloudinary
    console.log(`\n📤 Uploading image to Cloudinary...`);
    const cloudinaryData = await uploadImageToCloudinary(uploadedFilePath);

    console.log(`   ✅ Uploaded successfully`);
    console.log(`   ✅ Cloudinary ID: ${cloudinaryData.public_id}`);
    console.log(`   ✅ URL: ${cloudinaryData.secure_url}`);
    console.log(`   ✅ Dimensions: ${cloudinaryData.width}x${cloudinaryData.height}`);

    // Generate embedding from title, description, and tags
    const embeddingText = cloudinaryData.secure_url;

    console.log(`\n📡 Generating embedding...`);
    console.log(`   Text for embedding: "${embeddingText.substring(0, 100)}..."`);

    const embedding = await generateTextEmbedding(embeddingText);

    console.log(`   ✅ Embedding generated: ${embedding.length} dimensions`);
    console.log(`   ✅ Sample values: [${Array.from(embedding.slice(0, 5)).map(v => v.toFixed(4)).join(', ')}]`);

    // Convert to binary for storage
    // const embeddingBuffer = convertEmbeddingToBinary(embedding);
    // console.log(`   ✅ Converted to binary: ${embeddingBuffer.length} bytes`);

    const embeddingArray = Array.from(embedding);
    console.log("embeddingArray>>>>", embeddingArray)

    // Save to MongoDB
    console.log(`\n💾 Saving to MongoDB...`);

    const db = getDatabase();
    const collection = db.collection<IImage>('images');

    const document: IImage = {
      title,
      description: description || `Image: ${title}`,
      cloudinary_url: cloudinaryData.secure_url,
      cloudinary_id: cloudinaryData.public_id,
      tags: tagsArray,
      embedding: embeddingArray,
      image_metadata: {
        width: cloudinaryData.width,
        height: cloudinaryData.height,
        format: cloudinaryData.format,
      },
      created_at: new Date(),
    };

    const result = await collection.insertOne(document);

    console.log(`   ✅ Document inserted: ${result.insertedId}\n`);

    // Clean up temporary file
    if (fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
      console.log(`🗑️  Temporary file cleaned up\n`);
    }

    return res.status(201).json({
      success: true,
      message: 'Image added successfully with embedding',
      image: {
        _id: result.insertedId,
        title,
        cloudinary_url: cloudinaryData.secure_url,
        cloudinary_id: cloudinaryData.public_id,
        image_dimensions: {
          width: cloudinaryData.width,
          height: cloudinaryData.height,
        },
        tags: tagsArray,
      },
      embedding: {
        dimension: embedding.length,
        storage_format: 'Binary (Base64 in MongoDB)',
        sample_values: Array.from(embedding.slice(0, 5)),
      },
      model: 'Xenova/all-MiniLM-L6-v2',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Add image error:', error);

    // Clean up file if upload failed
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }

    res.status(500).json({
      success: false,
      error: `Failed to add image: ${error}`,
    });
  }
});

/**
 * Get image by ID
 * GET /api/vector/text-to-image/:id
 */
router.get('/text-to-image/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const db = getDatabase();
    const collection = db.collection<IImage>('images');

    const image = await collection.findOne({ _id: require('mongodb').ObjectId.createFromHexString(id) });

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      });
    }

    return res.json({
      success: true,
      image: {
        _id: image._id,
        title: image.title,
        description: image.description,
        cloudinary_url: image.cloudinary_url,
        cloudinary_id: image.cloudinary_id,
        tags: image.tags,
        image_metadata: image.image_metadata,
        created_at: image.created_at,
      },
    });
  } catch (error) {
    console.error('❌ Get image error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to get image: ${error}`,
    });
  }
});

/**
 * Delete image
 * DELETE /api/vector/text-to-image/:id
 */
router.delete('/text-to-image/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const db = getDatabase();
    const collection = db.collection<IImage>('images');

    const image = await collection.findOne({ _id: require('mongodb').ObjectId.createFromHexString(id) });

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      });
    }

    // Delete from MongoDB
    await collection.deleteOne({ _id: require('mongodb').ObjectId.createFromHexString(id) });

    return res.json({
      success: true,
      message: 'Image deleted successfully',
      deleted_id: id,
    });
  } catch (error) {
    console.error('❌ Delete image error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to delete image: ${error}`,
    });
  }
});

export default router;