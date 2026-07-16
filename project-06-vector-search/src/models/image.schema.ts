/**
 * Image Collection Schema
 * 
 * Used by: /api/vector/text-to-image routes
 * Storage: Cloudinary (CDN)
 * Index: Vector search index on 'embedding' field
 * 
 * Binary Conversion Pattern:
 * 1. Image tags + title → text embedding
 * 2. Float32Array → Buffer → BSON Binary
 * 3. Stored with Cloudinary URL reference
 */

export interface IImage {
  _id?: any;
  title: string;
  description: string;
  tags: string[];
  cloudinary_url: string;      // CDN URL from Cloudinary
  cloudinary_id: string;        // Public ID for updates/deletes
  // embedding: Buffer;            // Binary representation of Float32Array
  embedding: number[];      
  created_at: Date;
  updated_at?: Date;
  image_metadata: any;
}

/**
 * Collection Creation Script
 * Run in MongoDB Atlas:
 */
export const IMAGES_INIT = `
db.createCollection("images", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "cloudinary_url", "cloudinary_id", "embedding", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        title: {
          bsonType: "string",
          description: "Image title"
        },
        description: {
          bsonType: "string",
          description: "Image description"
        },
        tags: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Image tags for semantic search"
        },
        cloudinary_url: {
          bsonType: "string",
          description: "CDN URL from Cloudinary"
        },
        cloudinary_id: {
          bsonType: "string",
          description: "Cloudinary public ID for management"
        },
        embedding: {
          bsonType: "binData",
          description: "Vector embedding of title + tags (Float32Array as Binary)"
        },
        created_at: {
          bsonType: "date",
          description: "Image creation timestamp"
        },
        updated_at: {
          bsonType: "date",
          description: "Image update timestamp"
        }
      }
    }
  }
});

// Create vector search index
db.images.createSearchIndex(
  {
    name: "image_embedding_index",
    definition: {
      mappings: {
        dynamic: true,
        fields: {
          embedding: {
            type: "vector",
            dimensions: 384,
            similarity: "cosine"
          }
        }
      }
    }
  }
);
`;

/**
 * Document Example:
 * {
 *   _id: ObjectId("..."),
 *   title: "Mountain Sunset",
 *   description: "Beautiful sunset over snow-capped mountains",
 *   tags: ["sunset", "mountains", "landscape", "nature"],
 *   cloudinary_url: "https://res.cloudinary.com/cloud/image/upload/v123/mountain_sunset.jpg",
 *   cloudinary_id: "mountain_sunset",
 *   embedding: BinData(0, "base64encodedFloatArray..."),
 *   created_at: ISODate("2024-01-15T10:00:00Z"),
 *   updated_at: ISODate("2024-01-15T10:00:00Z")
 * }
 */