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

```

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
```
### Image-to-Image Search

**Use Case:**  A user uploads a query image, and the system returns visually and conceptually similar images stored in the database.

**Data Flow:**

```mermaid
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
```
**Vector Embeddings: The Foundation** 

Before diving into the search algorithms, it's essential to understand what is being searched. Vector search operates on vector embeddings—high-dimensional arrays of numbers (e.g., a 1536-dimensional array) that represent the semantic meaning of data (text, images, audio). 

When you query the database, your query (e.g., "fast sports car") is converted into a vector by an embedding model. The database's job is to find the vectors in your collection that are physically closest to your query vector in that high-dimensional space. Distance metrics like Cosine Similarity or Dot Product determine "closeness" (similarity).

**Approximate Nearest Neighbor (ANN) using HNSW**

Approximate Nearest Neighbor (ANN) is the algorithm designed for speed and scale. It trades a tiny amount of accuracy (exactness) for massive performance gains, enabling sub-50ms latency across millions or billions of vectors.
MongoDB Vector Search uses the Hierarchical Navigable Small World (HNSW) algorithm to perform ANN searches.

## How HNSW Works Internally
Imagine trying to find a specific house in a sprawling, unfamiliar city.
 - Without a map (Brute Force): You check every single street.
 - With HNSW: You start on a highway, take an exit to a main road, turn onto a neighborhood street, and finally navigate to the exact address.
 
## HNSW builds a multi-layered graph during indexing:
 - The Base Layer (Layer 0): Contains every single vector in your collection. Each vector is connected (via "edges") to a few of its closest neighbors.
 - Upper Layers (Layer 1, Layer 2, etc.): These layers act as "highways." As you go up, fewer and fewer vectors are included, and the connections between them span much larger distances across the vector space.
 
 **The ANN / HNSW Query Execution Flow**
 When a $vectorSearch ANN query is executed, MongoDB traverses this graph:Entry Point: 
 - The search begins at the very top layer, starting at a pre-defined entry node.
 - Greedy Routing Downward: It looks at the connected neighbors in the current layer and moves to the node that is closest to the query vector. It repeats this until it can't get any closer on that layer, then it drops down to the layer below.
 - Local Search at the Base Layer: Once it reaches Layer 0 (which contains all vectors), it explores the neighborhood around the closest point found so far.
 - The numCandidates Parameter: This is crucial. It tells the algorithm how many candidate neighbors to keep in memory while searching Layer 0.
   - A high numCandidates (e.g., 200) means it explores further into the local neighborhood, increasing accuracy (recall) but taking slightly longer. 
   - A low numCandidates (e.g., 20) makes it extremely fast but risks missing the true closest neighbor:
 - Final Sort: The final candidate list is sorted by exact distance, and the top limit vectors are returned to the user.

```mermaid
 graph TD
    A[Start Search: Query Vector] --> B[Enter HNSW Graph at Top Layer]
    B --> C{Find closest neighbor in current layer}
    C -->|Closer neighbor found| C
    C -->|No closer neighbor| D{Is this Layer 0?}
    D -->|No| E[Drop to Layer Below]
    E --> C
    D -->|Yes| F[Local Search in Layer 0]
    F -->|Explore 'numCandidates' neighbors| G[Calculate exact distance for candidates]
    G --> H[Sort candidates by distance]
    H --> I[Return top 'limit' vectors]

    classDef graphNode fill:#d4e1f9,stroke:#333,stroke-width:2px;
    class B,C,D,E,F graphNode;
```
3. Exact Nearest Neighbor (ENN)Exact Nearest Neighbor (ENN) is the brute-force approach. It prioritizes absolute precision (perfect recall) over query speed.Introduced to MongoDB Atlas Vector Search as an option within the $vectorSearch stage (using exact: true), ENN bypasses the HNSW graph entirely.  

How ENN Works InternallyThe mechanics of ENN are straightforward but computationally expensive:Full Sequential Scan: The database takes your query vector and mathematically compares it against every single vector in the specified collection (or the subset of vectors that passed a pre-filter).  Distance Calculation: It computes the exact distance (e.g., dot product) for every pair.Sort and Limit: It sorts the entire dataset by that distance and returns the top limit results.

## The ENN Query Execution Flow

```mermaid
graph TD
    A[Start Search: Query Vector] --> B{Pre-filter applied?}
    B -->|Yes| C[Apply standard MongoDB filters first]
    B -->|No| D[Target all documents in collection]
    C --> D
    D --> E[Calculate distance against Document 1]
    D --> F[Calculate distance against Document 2]
    D --> G[...]
    D --> H[Calculate distance against Document N]
    E & F & G & H --> I[Sort all calculated distances]
    I --> J[Return top 'limit' exact vectors]

    classDef exactNode fill:#f9d4d4,stroke:#333,stroke-width:2px;
    class E,F,G,H,I exactNode;
```