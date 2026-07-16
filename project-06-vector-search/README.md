# Project 06: Vector Search & Multimodal AI

## Overview

Express.js + MongoDB Atlas Vector Search for semantic search and multimodal AI use cases.

**Supported Features:**
- ✅ Text-to-Text semantic search
- ✅ Text-to-Image retrieval
- ✅ Image-to-Text discovery
- ✅ Sample movies dataset integration
- ✅ Custom embedding generation
- ✅ Cloudinary image management
- ✅ Bring Your Own Embeddings (BYOE) pattern

## Prerequisites

1. **MongoDB Atlas Account** (Free M0 tier available)
   - Create cluster
   - Enable Vector Search

2. **Hugging Face API Key**
   - Sign up at https://huggingface.co
   - Generate API token
   - Model: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)

3. **Cloudinary Account** (for image handling)
   - Sign up at https://cloudinary.com
   - Get credentials

## Setup

```bash
cd project-04-vector-search
npm install

# Create .env file
cp .env.example .env

# Add your credentials:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
# HUGGING_FACE_API_KEY=hf_xxx
# CLOUDINARY_CLOUD_NAME=xxx
# CLOUDINARY_API_KEY=xxx
# CLOUDINARY_API_SECRET=xxx

npm run dev

## API Endpoints
1. Text-to-Text Search
Find similar documents by text:

curl -X POST http://localhost:3021/api/vector/text-to-text \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning algorithms",
    "limit": 5
  }'

Add text document:

curl -X POST http://localhost:3021/api/vector/text-to-text/add \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ML Basics",
    "content": "Machine learning is a subset of artificial intelligence..."
  }'

2. Text-to-Image Search
Find images by text description:

curl -X POST http://localhost:3021/api/vector/text-to-image \
  -H "Content-Type: application/json" \
  -d '{
    "description": "sunset over mountains",
    "limit": 5
  }'

Add image with tags:

curl -X POST http://localhost:3021/api/vector/text-to-image/add \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mountain Sunset",
    "imageUrl": "https://example.com/sunset.jpg",
    "tags": ["sunset", "mountains", "landscape"]
  }'

3. Image-to-Text Search
Find text matching image description:

curl -X POST http://localhost:3021/api/vector/image-to-text \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "limit": 5
  }'

4. Sample Movies Search
Search MongoDB Atlas sample dataset:

curl -X POST http://localhost:3021/api/vector/sample-movies \
  -H "Content-Type: application/json" \
  -d '{
    "query": "sci-fi adventure in space",
    "limit": 10
  }'

Get collection info:

curl http://localhost:3021/api/vector/sample-movies/info

5. Embedding Generation
Test embedding:

curl http://localhost:3021/api/vector/embeddings/test

Generate custom embedding:

curl -X POST http://localhost:3021/api/vector/embeddings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "hello world"
  }'

Architecture
Vector Search Flow:

Text Input
    ↓
Hugging Face API (sentence-transformers)
    ↓
Float32Array (384 dimensions)
    ↓
Binary Serialization (BSON) (work only production cluster not on free instance cluster M0)
    ↓
MongoDB Atlas (Vector Index)
    ↓
Cosine Similarity Search ($search)
    ↓
Ranked Results

# MongoDB Atlas Vector Search: Cross-Modal Architectures

This repository demonstrates how to build advanced **Image-to-Text** and **Image-to-Image** vector search engines using MongoDB Atlas, Cloudinary AI, and local Hugging Face embedding models.

Rather than using computationally expensive multimodal models (like CLIP), this architecture leverages a **Cross-Modal Bridge Pattern**. It uses Cloudinary to extract descriptive text from images, embeds that text using a local text model (`all-MiniLM-L6-v2`), and performs a vector search against MongoDB.

## Architectures

### 1. Image-to-Text Search

**Use Case:** A user uploads a query image (e.g., a photo of a dog in a park), and the system returns the most semantically relevant text documents from the database.

**Data Flow:**

```mermaid
graph TD
    A[Client: Upload Query Image] --> B[Server: Multer Middleware]
    B --> C[Cloudinary: Google Auto-Tagging]
    C -->|Extract Tags e.g., 'dog, park, grass'| D[Server: Combine Tags]
    D --> E[Local Model: Xenova/all-MiniLM-L6-v2]
    E -->|Generate 384d Float32Array| F[Query Vector]
    F --> G[MongoDB: $vectorSearch on 'text_targets']
    G --> H[Client: Return Text Documents]

    classDef cloudinary fill:#f9f,stroke:#333,stroke-width:2px;
    classDef mongo fill:#cfc,stroke:#333,stroke-width:2px;
    class C cloudinary;
    class G mongo;

### Image-to-Image Search

**Use Case:**  A user uploads a query image, and the system returns visually and conceptually similar images stored in the database.

**Data Flow:**

graph TD
    A[Client: Upload Query Image] --> B[Server: Multer Middleware]
    B --> C[Cloudinary: Google Auto-Tagging]
    C -->|Extract Tags| D[Server: Combine Tags]
    D --> E[Local Model: Xenova/all-MiniLM-L6-v2]
    E -->|Generate 384d Float32Array| F[Query Vector]
    F --> G[MongoDB: $vectorSearch on 'images']
    G -->|Filter Score > 50%| H[Client: Return Similar Images]

    classDef cloudinary fill:#f9f,stroke:#333,stroke-width:2px;
    classDef mongo fill:#cfc,stroke:#333,stroke-width:2px;
    class C cloudinary;
    class G mongo;