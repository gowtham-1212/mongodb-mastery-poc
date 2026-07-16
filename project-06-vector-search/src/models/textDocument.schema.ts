/**
 * Text Document Collection Schema
 * 
 * Used by: /api/vector/text-to-text routes
 * Index: Vector search index on 'embedding' field
 * 
 * Binary Conversion Pattern:
 * 1. Float32Array (embedding) → Buffer → BSON Binary
 * 2. Stored in MongoDB as BinData
 * 3. Retrieved and converted back to Float32Array for search
 */

import { Binary } from "mongodb";

export interface ITextDocument {
  _id?: any;
  title: string;
  content: string;
  // embedding: Binary; // Binary representation of Float32Array
  embedding: number[];
  created_at: Date;
  updated_at?: Date;
}

/**
 * Collection Creation Script
 * Run in MongoDB Atlas:
 */
export const TEXT_DOCUMENTS_INIT = `
db.createCollection("text_documents", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "content", "embedding", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        title: {
          bsonType: "string",
          description: "Document title"
        },
        content: {
          bsonType: "string",
          description: "Document content - will be embedded"
        },
        embedding: {
          bsonType: "binData",
          description: "Vector embedding (Float32Array as Binary)"
        },
        created_at: {
          bsonType: "date",
          description: "Document creation timestamp"
        },
        updated_at: {
          bsonType: "date",
          description: "Document update timestamp"
        }
      }
    }
  }
});

// Create vector search index
db.text_documents.createSearchIndex(
  {
    name: "text_embedding_index",
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
 *   title: "Machine Learning Basics",
 *   content: "Machine learning is a subset of artificial intelligence...",
 *   embedding: BinData(0, "base64encodedFloatArray..."),
 *   created_at: ISODate("2024-01-15T10:00:00Z"),
 *   updated_at: ISODate("2024-01-15T10:00:00Z")
 * }
 */