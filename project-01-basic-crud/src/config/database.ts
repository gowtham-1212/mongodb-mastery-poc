/**
 * MongoDB Connection Configuration
 * 
 * Handles connection to MongoDB with proper error handling and connection pooling.
 * Uses environment variables for connection URI to ensure no hardcoded credentials.
 */

import mongoose from 'mongoose';

export class DatabaseConnection {
  private static instance: mongoose.Connection;

  public static async connect(): Promise<mongoose.Connection> {
    if (this.instance) {
      return this.instance;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce-inventory';

    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
      });

      this.instance = mongoose.connection;

      this.instance.on('connected', () => {
        console.log('✓ MongoDB Connected Successfully');
      });

      this.instance.on('error', (error) => {
        console.error('✗ MongoDB Connection Error:', error);
      });

      this.instance.on('disconnected', () => {
        console.warn('⚠ MongoDB Disconnected');
      });

      return this.instance;
    } catch (error) {
      console.error('✗ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    if (this.instance) {
      await mongoose.disconnect();
      console.log('✓ MongoDB Disconnected');
    }
  }

  public static getConnection(): mongoose.Connection {
    if (!this.instance) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.instance;
  }
}