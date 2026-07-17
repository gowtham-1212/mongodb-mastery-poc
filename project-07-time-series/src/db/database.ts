import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);
let db: Db;

export async function connectDB() {
  await client.connect();
  db = client.db('Mongodb_pocs');
  console.log('✅ Connected to MongoDB');

  await initializeTimeSeries();
  return db;
}

export function getDB() {
  return db;
}

/**
 * Architect's Best Practice: Automatically initialize the Time Series
 * collection on startup if it does not exist.
 */
async function initializeTimeSeries() {
  try {
    await db.createCollection('transactions', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        // Granularity 'seconds' is perfect for high-frequency payment gateways
        granularity: 'seconds', 
      },
    });
    console.log('🏗️  Time Series collection "transactions" created.');
  } catch (error: any) {
    // Code 48 means "NamespaceExists" (Collection already exists)
    if (error.code === 48) {
      console.log('⚡ Time Series collection "transactions" already exists.');
    } else {
      console.error('❌ Failed to create Time Series collection:', error);
      throw error;
    }
  }
}