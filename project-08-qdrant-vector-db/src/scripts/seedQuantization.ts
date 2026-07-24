import { qdrant } from '../config/qdrantClient';
import { getTextEmbedding } from '../services/textEmbeddingService';

const dummyData = [
  { id: 1, text: "High performance wireless gaming mouse" },
  { id: 2, text: "Mechanical keyboard with cherry blue switches" },
  { id: 3, text: "4K ultra HD curved gaming monitor" },
  { id: 4, text: "Noise cancelling over-ear headphones" },
  { id: 5, text: "Ergonomic office chair with lumbar support" }
];

async function seed() {
  console.log("🌱 Starting Seeding Process...");
  const collections = ['quant_scalar', 'quant_product', 'quant_binary'];

  for (const item of dummyData) {
    console.log(`Embedding text: "${item.text}"`);
    const vector = await getTextEmbedding(item.text);

    for (const collection of collections) {
      await qdrant.upsert(collection, {
        wait: true,
        points: [{ id: item.id, vector, payload: { text: item.text } }]
      });
    }
  }
  
  console.log("✅ Seeding Complete! Data inserted into Scalar, Product, and Binary collections.");
}

seed().catch(console.error);