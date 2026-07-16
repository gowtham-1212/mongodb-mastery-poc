import { MongoClient, Db } from 'mongodb';
import 'dotenv/config';

let db: Db;
let client: MongoClient;

export async function connectDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'vector_search_db';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log(`✅ Connected to MongoDB: ${dbName}`);
  return db;
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    console.log('❌ Disconnected from MongoDB');
  }
}