import { MongoClient, Db } from 'mongodb';

export class DatabaseConnection {
  private static client: MongoClient;
  private static db?: Db;

  public static async connect(uri: string, dbName: string): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    this.client = new MongoClient(uri, {
      maxPoolSize: 12,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000
    });

    await this.client.connect();
    this.db = this.client.db(dbName);

    return this.db;
  }

  public static getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  public static async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}