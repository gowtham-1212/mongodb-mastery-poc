import express, { Request, Response } from 'express';
import { qdrant } from '../config/qdrantClient';
import { getClipTextEmbedding } from '../services/textToImageService';
import { getClipImageEmbedding } from '../services/imageToImageService';
import multer from 'multer';

const router = express.Router();

// Configure Multer to keep uploaded files in RAM (Buffer) instead of saving to disk
const upload = multer({ storage: multer.memoryStorage() });

// Insert record into text_to_image_collection
router.post('/text-to-image/records', upload.any(), async (req: Request, res: Response) => {
  try {
    const { id, title, imageUrl } = req.body;

    // upload.any() puts all uploaded files into an array called req.files
    const files = req.files as Express.Multer.File[];
    const uploadedFile = files && files.length > 0 ? files[0] : null;

    // 1. Determine the source: Use the uploaded file Buffer if it exists, otherwise use the URL
    const imageSource = uploadedFile ? uploadedFile.buffer : imageUrl;

    if (!imageSource) {
      return res.status(400).json({ error: "Please provide either an 'image' file upload or an 'imageUrl' string." });
    }

    // Convert the form-data string into a strict Base-10 integer
    const numericId: number = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return res.status(400).json({ error: "The 'id' field must be a valid number." });
    }

    // Embed the target image into CLIP 512-dim vector space
    const vector = await getClipImageEmbedding(imageSource);

    await qdrant.upsert('text_to_image_collection', {
      wait: true,
      points: [{ id: numericId, vector, payload: { title, imageUrl: uploadedFile ? 'local_upload' : imageUrl } }],
    });

    res.json({ message: `Text-to-Image record ${id} inserted successfully.` });
  } catch (err: any) {
    console.error("IMAGE ", err)
    res.status(500).json({ error: err.message });
  }
});

// Query Image by Text Prompt
router.post('/text-to-image/search', async (req: Request, res: Response) => {
  try {
    const { textQuery } = req.body;

    // Convert text prompt to CLIP vector
    const queryVector = await getClipTextEmbedding(textQuery);

    const results = await qdrant.search('text_to_image_collection', {
      vector: queryVector,
      limit: 3,
      with_payload: true,
    });

    res.json({ query: textQuery, results });
  } catch (err: any) {
    console.error("Text-to-image ", err)
    res.status(500).json({ error: err.message });
  }
});

export default router;