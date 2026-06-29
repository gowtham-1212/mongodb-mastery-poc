/**
 * User Model for E-Commerce System
 * 
 * Represents user profiles with tags, preferences, and activity tracking.
 * Used to demonstrate various MongoDB operators: comparison, logical, element, and array operators.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types/index';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      min: 13,
      max: 120,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    preferences: {
      newsletter: { type: Boolean, default: false },
      notifications: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUserDocument>('User', userSchema);