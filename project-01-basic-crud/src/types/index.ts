/**
 * Type Definitions for Project 01 - Basic CRUD & Operators
 */

export interface IUser {
  _id?: string;
  email: string;
  name: string;
  age: number;
  isActive: boolean;
  tags: string[];
  preferences?: {
    newsletter: boolean;
    notifications: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProduct {
  _id?: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  isActive: boolean;
  tags: string[];
  reviews?: Array<{
    userId: string;
    rating: number;
    comment: string;
  }>;
  metadata?: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QueryResponse<T> {
  success: boolean;
  data?: T | T[];
  message: string;
  count?: number;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
}