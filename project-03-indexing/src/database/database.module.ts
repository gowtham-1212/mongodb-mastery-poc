import { Module } from '@nestjs/common';
import { MongoClient } from 'mongodb';

const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
const DATABASE_DB = 'DATABASE_DB';

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: async () => {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        const client = new MongoClient(uri);
        await client.connect();
        return client;
      },
    },
    {
      provide: DATABASE_DB,
      useFactory: (client: MongoClient) => {
        const dbName = process.env.DB_NAME || 'indexing-analytics-poc';
        return client.db(dbName);
      },
      inject: [DATABASE_CONNECTION],
    },
  ],
  exports: [DATABASE_DB],
})
export class DatabaseModule {}