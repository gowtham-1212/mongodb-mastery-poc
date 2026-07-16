import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//cloudinary package method
export async function uploadImageToCloudinary(imageSource: string) {
  try {
    console.log(`🚀 Uploading to Cloudinary: ${imageSource}`);
    
    // The Cloudinary SDK automatically handles files, URLs, and cryptographic signatures!
    const response = await cloudinary.uploader.upload(imageSource, {
      folder: 'vector_search_poc', // Keeps your Cloudinary account organized
    });

    console.log(`✅ Cloudinary upload successful`);

    return {
      secure_url: response.secure_url,
      public_id: response.public_id,
      format: response.format,
      width: response.width,
      height: response.height,
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Cloudinary upload failed: ${error}`);
  }
}

/**
 * Get image metadata from Cloudinary using the Admin API
 */
export async function getCloudinaryImageMetadata(publicId: string): Promise<any> {
  try {
    console.log(`🔍 Fetching metadata for Cloudinary ID: ${publicId}`);
    
    // The SDK automatically handles the Basic Auth and API routing
    const response = await cloudinary.api.resource(publicId);
    
    return response;
  } catch (error) {
    console.error('❌ Error fetching image metadata:', error);
    throw new Error(`Failed to fetch image metadata: ${error}`);
  }
}

/**
 * Generate Cloudinary URL with transformations using the URL helper
 */
export function generateCloudinaryUrl(publicId: string, transformations?: Record<string, any>): string {
  try {
    // The SDK automatically translates a JS object into the correct URL syntax
    // Example: { width: 500, crop: "fill", fetch_format: "auto" }
    // Becomes: .../upload/c_fill,f_auto,w_500/v1/...
    const url = cloudinary.url(publicId, transformations);
    
    return url;
  } catch (error) {
    console.error('❌ Error generating Cloudinary URL:', error);
    throw new Error(`Failed to generate Cloudinary URL: ${error}`);
  }
}

export async function uploadImageAndExtractTags(imageSource: string) {
  try {
    console.log(`🚀 Uploading to Cloudinary & Extracting AI Tags...`);
    
    const response = await cloudinary.uploader.upload(imageSource, {
      folder: 'vector_search_image_to_tex_poc',
      // Tell Cloudinary's AI to analyze the image and return text tags!
      categorization: 'google_tagging',
      auto_tagging: 0.6, // Only return tags the AI is 60%+ confident about
    });

    // Extract the tags into a simple array of strings
    const tags = response.tags || [];
    
    return {
      secure_url: response.secure_url,
      tags: tags,
    };
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error}`);
  }
}

/**
 * Upload image to Cloudinary from file path or URL
 * @param imageSource - Either file path (string starting with /) or URL
 */
// export async function uploadImageToCloudinary(imageSource: string): Promise<CloudinaryUploadResponse> {
//   try {
//     if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
//       throw new Error('Cloudinary credentials not configured in .env');
//     }

//     const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
//     const formData = new FormData();

//     // Check if it's a file path or URL
//     if (imageSource.startsWith('/') || imageSource.startsWith('.')) {
//       // It's a file path
//       console.log(`   📁 Uploading from file: ${imageSource}`);

//       if (!fs.existsSync(imageSource)) {
//         throw new Error(`File not found: ${imageSource}`);
//       }

//       const fileStream = fs.createReadStream(imageSource);
//       formData.append('file', fileStream);
//     } else {
//       // It's a URL
//       console.log(`   🌐 Uploading from URL: ${imageSource}`);
//       formData.append('file', imageSource);
//     }

//     formData.append('api_key', CLOUDINARY_API_KEY);

//     console.log(`   🚀 Sending to Cloudinary...`);

//     const response = await axios.post(url, formData, {
//       headers: formData.getHeaders(),
//       timeout: 30000, // 30 second timeout
//     });

//     console.log(`   ✅ Cloudinary upload successful`);

//     return {
//       secure_url: response.data.secure_url,
//       public_id: response.data.public_id,
//       format: response.data.format,
//       width: response.data.width,
//       height: response.data.height,
//     };
//   } catch (error) {
//     console.error('❌ Cloudinary upload error:', error);
//     throw new Error(`Failed to upload image to Cloudinary: ${error}`);
//   }
// }

/**
 * Get image metadata from Cloudinary
 */
// export async function getCloudinaryImageMetadata(publicId: string): Promise<any> {
//   try {
//     if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
//       throw new Error('Cloudinary credentials not configured');
//     }

//     const response = await axios.get(
//       `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image/${publicId}`,
//       {
//         auth: {
//           username: CLOUDINARY_API_KEY,
//           password: CLOUDINARY_API_SECRET,
//         },
//       },
//     );

//     return response.data;
//   } catch (error) {
//     console.error('Error fetching image metadata:', error);
//     throw new Error(`Failed to fetch image metadata: ${error}`);
//   }
// }

/**
 * Generate Cloudinary URL with transformations
 */
// export function generateCloudinaryUrl(publicId: string, transformations?: Record<string, any>): string {
//   const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

//   if (!transformations || Object.keys(transformations).length === 0) {
//     return `${baseUrl}/${publicId}`;
//   }

//   const transformString = Object.entries(transformations)
//     .map(([key, value]) => `${key}_${value}`)
//     .join(',');

//   return `${baseUrl}/${transformString}/${publicId}`;
// }