/**
 * Comparison Operators Route
 * 
 * Demonstrates: $eq, $gt, $gte, $lt, $lte, $in, $nin, $ne
 * 
 * USE CASES:
 * - $eq: Find users with exact age match
 * - $gt/$gte: Find products above/at price threshold
 * - $lt/$lte: Find users below age limit, products with low stock
 * - $in: Find users in specific cities or with specific roles
 * - $nin: Find products NOT in certain categories
 * - $ne: Find active users (isActive != false)
 */

import { Router, Request, Response } from 'express';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { QueryResponse } from '../types/index';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/comparison/products-by-price
 * 
 * Query Parameters:
 * - operator: 'gt' | 'gte' | 'lt' | 'lte'
 * - price: number
 * 
 * Example: GET /api/comparison/products-by-price?operator=gt&price=50
 * 
 * TECHNICAL RATIONALE:
 * Uses comparison operators to filter products by price ranges.
 * Demonstrates how $gt and friends are essential for range queries,
 * more efficient than application-level filtering on large datasets.
 */
router.get(
  '/products-by-price',
  asyncHandler(async (req: Request, res: Response) => {
    const { operator, price } = req.query;

    if (!operator || !price) {
      throw new AppError('Missing required parameters: operator, price', 400);
    }

    const priceValue = parseFloat(price as string);
    if (isNaN(priceValue)) {
      throw new AppError('Price must be a valid number', 400);
    }

    const operatorMap: Record<string, object> = {
      gt: { price: { $gt: priceValue } },
      gte: { price: { $gte: priceValue } },
      lt: { price: { $lt: priceValue } },
      lte: { price: { $lte: priceValue } },
    };

    if (!operatorMap[operator as string]) {
      throw new AppError('Invalid operator. Use: gt, gte, lt, lte', 400);
    }

    const products = await Product.find(operatorMap[operator as string]);

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/comparison/users-by-age
 * 
 * Query Parameters:
 * - operator: 'eq' | 'gt' | 'lt'
 * - age: number
 * 
 * Example: GET /api/comparison/users-by-age?operator=eq&age=25
 * 
 * TECHNICAL RATIONALE:
 * The $eq operator explicitly matches a field value.
 * While MongoDB treats { field: value } as implicit $eq,
 * explicit $eq is valuable for programmatic query building.
 */
router.get(
  '/users-by-age',
  asyncHandler(async (req: Request, res: Response) => {
    const { operator, age } = req.query;

    if (!operator || !age) {
      throw new AppError('Missing required parameters: operator, age', 400);
    }

    const ageValue = parseInt(age as string);
    if (isNaN(ageValue)) {
      throw new AppError('Age must be a valid number', 400);
    }

    const operatorMap: Record<string, object> = {
      eq: { age: { $eq: ageValue } },
      gt: { age: { $gt: ageValue } },
      gte: { age: { $gte: ageValue } },
      lt: { age: { $lt: ageValue } },
      lte: { age: { $lte: ageValue } },
    };

    if (!operatorMap[operator as string]) {
      throw new AppError('Invalid operator. Use: eq, gt, gte, lt, lte', 400);
    }

    const users = await User.find(operatorMap[operator as string]);

    const response: QueryResponse<typeof users> = {
      success: true,
      data: users,
      count: users.length,
      message: `Found ${users.length} users`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/comparison/products-in-categories
 * 
 * Query Parameters:
 * - categories: comma-separated category names
 * 
 * Example: GET /api/comparison/products-in-categories?categories=electronics,books
 * 
 * TECHNICAL RATIONALE:
 * $in finds documents where a field matches ANY value in an array.
 * This is superior to multiple $or conditions for performance and readability.
 * MongoDB can optimize $in queries with index prefixes.
 */
router.get(
  '/?',
  asyncHandler(async (req: Request, res: Response) => {
    const { categories } = req.query;

    if (!categories) {
      throw new AppError('Missing required parameter: categories', 400);
    }

    const categoryList = (categories as string).split(',').map((c) => c.trim());

    const products = await Product.find({
      category: { $in: categoryList },
    });

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products in specified categories`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/comparison/products-not-in-categories
 * 
 * Query Parameters:
 * - categories: comma-separated category names to EXCLUDE
 * 
 * Example: GET /api/comparison/products-not-in-categories?categories=discontinued,archived
 * 
 * TECHNICAL RATIONALE:
 * $nin (not in) is the inverse of $in.
 * Use case: Exclude archived or discontinued product categories from inventory lists.
 * Performance: MongoDB still uses indexes efficiently with $nin.
 */
router.get(
  '/products-not-in-categories',
  asyncHandler(async (req: Request, res: Response) => {
    const { categories } = req.query;

    if (!categories) {
      throw new AppError('Missing required parameter: categories', 400);
    }

    const categoryList = (categories as string).split(',').map((c) => c.trim());

    const products = await Product.find({
      category: { $nin: categoryList },
    });

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products not in specified categories`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/comparison/users-not-equal
 * 
 * Query Parameters:
 * - field: 'email' | 'name' | any user field
 * - value: string or value to NOT match
 * 
 * Example: GET /api/comparison/users-not-equal?field=email&value=test@example.com
 * 
 * TECHNICAL RATIONALE:
 * $ne (not equal) returns documents where field != value.
 * Useful for finding all active users except a specific one,
 * or excluding test/admin accounts from reports.
 */
router.get(
  '/users-not-equal',
  asyncHandler(async (req: Request, res: Response) => {
    const { field, value } = req.query;

    if (!field || !value) {
      throw new AppError('Missing required parameters: field, value', 400);
    }

    const query: Record<string, object> = {};
    query[field as string] = { $ne: value };

    const users = await User.find(query);

    const response: QueryResponse<typeof users> = {
      success: true,
      data: users,
      count: users.length,
      message: `Found ${users.length} users where ${field} != ${value}`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

export default router;