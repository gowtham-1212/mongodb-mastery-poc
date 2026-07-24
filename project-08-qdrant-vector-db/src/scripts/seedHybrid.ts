import { qdrant } from '../config/qdrantClient';
import { getTextEmbedding } from '../services/textEmbeddingService';
import { getSparseEmbedding } from '../services/sparseEmbeddingService';

const dummyData = [
  { id: 1, text: "Apple iPhone 15 Pro Max 256GB Titanium" },
  { id: 2, text: "Samsung Galaxy S24 Ultra 512GB Black" },
  { id: 3, text: "A generic brand smartphone with a titanium case" },
  { id: 4, text: "Apple MacBook Pro M3 Max 1TB" }
];

async function seedHybrid() {
  console.log("🌱 Starting Hybrid Seeding...");

  for (const item of dummyData) {
    console.log(`Embedding text: "${item.text}"`);
    
    // Generate BOTH vectors
    const dense = await getTextEmbedding(item.text);
    const sparse = getSparseEmbedding(item.text);

    await qdrant.upsert('hybrid_collection', {
      wait: true,
      points: [{ 
        id: item.id, 
        vector: { "text_dense": dense, "text_sparse": sparse }, 
        payload: { text: item.text } 
      }]
    });
  }
  
  console.log("✅ Hybrid Seeding Complete!");
}

seedHybrid().catch(console.error);