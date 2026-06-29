/**
 * Product Model for E-Commerce Inventory
 * 
 * Represents products with pricing, inventory, categories, and customer reviews.
 * Demonstrates nested documents, arrays of objects, and complex querying scenarios.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { IProduct } from '../types/index';

export interface IProductDocument extends Omit<IProduct, '_id'>, Document {}

const reviewSchema = new Schema(
  {
    userId: String,
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
  },
  { _id: false }
);

const dimensionsSchema = new Schema(
  {
    length: Number,
    width: Number,
    height: Number,
  },
  { _id: false }
);

const metadataSchema = new Schema(
  {
    weight: Number,
    dimensions: dimensionsSchema,
  },
  { _id: false }
);

const productSchema = new Schema<IProductDocument>(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    metadata: metadataSchema,
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model<IProductDocument>('Product', productSchema);