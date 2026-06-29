/**
 * Array Operators Route
 * 
 * Demonstrates: $all, $elemMatch, $size
 * 
 * USE CASES:
 * - $all: Find products that have ALL specified tags (e.g., "sale" AND "featured")
 * - $elemMatch: Find products with reviews that have ALL of (rating >= 4 AND userId exists)
 * - $size: Find users with exactly 3 tags, or products with exactly 2 reviews
 */

import { Router, Request, Response } from 'express';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { QueryResponse } from '../types/index';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/array/products-with-all-tags
 * 
 * Body: { tags: string[] }
 * 
 * Example:
 * {
 *   "tags": ["sale", "featured"]
 * }
 * 
 * TECHNICAL RATIONALE:
 * $all matches documents where an array field contains ALL specified elements.
 * Different from $in: $in matches ANY element, $all requires ALL elements.
 * 
 * USE CASE: "Find products that are simultaneously on sale AND featured"
 * 
 * PERFORMANCE CONSIDERATION:
 * $all cannot use array indexes efficiently, but MongoDB still optimizes well.
 * For best performance, limit the number of tags in the $all condition.
 */
router.post(
  '/products-with-all-tags',
  asyncHandler(async (req: Request, res: Response) => {
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new AppError('tags must be a non-empty array', 400);
    }

    const products = await Product.find({
      tags: { $all: tags },
    });

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products with ALL tags: ${tags.join(', ')}`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * POST /api/array/
 * 
 * Body: { minRating: number, userIdMustExist: boolean }
 * 
 * Example:
 * {
 *   "minRating": 4,
 *   "userIdMustExist": true
 * }
 * 
 * TECHNICAL RATIONALE:
 * $elemMatch matches documents containing array elements that satisfy ALL specified conditions.
 * Critical for querying arrays of nested objects where multiple criteria apply to the SAME object.
 * 
 * DIFFERENCE FROM $all:
 * - $all: Matches ANY array elements meeting criteria
 * - $elemMatch: Matches a SINGLE array element meeting ALL criteria
 * 
 * USE CASE: "Find products with reviews that are high-quality AND from verified users"
 * Example: Product has review1: { rating: 5, userId: "123" } and review2: { rating: 2, userId: null }
 * Query finds this product because review1 satisfies both conditions simultaneously.
 * 
 * PERFORMANCE: $elemMatch uses array indexes efficiently.
 */
router.post(
  '/products-by-reviews-criteria',
  asyncHandler(async (req: Request, res: Response) => {
    const { minRating, userIdMustExist } = req.body;

    if (typeof minRating !== 'number') {
      throw new AppError('minRating must be a number', 400);
    }

    const condition: Record<string, unknown> = {
      rating: { $gte: minRating },
    };

    if (userIdMustExist) {
      condition.userId = { $exists: true };
    }

    const products = await Product.find({
      reviews: { $elemMatch: condition },
    });

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products with reviews matching criteria`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/array/users-with-tag-count
 * 
 * Query Parameters:
 * - count: exact number of tags
 * 
 * Example: GET /api/array/users-with-tag-count?count=3
 * 
 * TECHNICAL RATIONALE:
 * $size matches documents where an array field has exactly the specified number of elements.
 * Cannot be used with range operators ($gt, $lt), only exact match.
 * 
 * USE CASE: Find users with exactly 3 tags (categorization completeness check).
 * 
 * PERFORMANCE NOTE:
 * $size does NOT use indexes efficiently in MongoDB.
 * For production systems with large datasets, avoid filtering by array size on frequently queried collections.
 * Alternative: Store array length separately as a denormalized field.
 */
router.get(
  '/users-with-tag-count',
  asyncHandler(async (req: Request, res: Response) => {
    const { count } = req.query;

    if (!count) {
      throw new AppError('Missing required parameter: count', 400);
    }

    const countValue = parseInt(count as string);
    if (isNaN(countValue) || countValue < 0) {
      throw new AppError('count must be a non-negative integer', 400);
    }

    const users = await User.find({
      tags: { $size: countValue },
    });

    const response: QueryResponse<typeof users> = {
      success: true,
      data: users,
      count: users.length,
      message: `Found ${users.length} users with exactly ${countValue} tags`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/array/products-with-review-count
 * 
 * Query Parameters:
 * - count: exact number of reviews
 * 
 * Example: GET /api/array/products-with-review-count?count=5
 * 
 * TECHNICAL RATIONALE:
 * Find products with exactly N reviews for inventory audits or marketing.
 * Identify "well-reviewed" products (exactly 5 reviews) vs "moderately reviewed" (10 reviews).
 */
router.get(
  '/products-with-review-count',
  asyncHandler(async (req: Request, res: Response) => {
    const { count } = req.query;

    if (!count) {
      throw new AppError('Missing required parameter: count', 400);
    }

    const countValue = parseInt(count as string);
    if (isNaN(countValue) || countValue < 0) {
      throw new AppError('count must be a non-negative integer', 400);
    }

    const products = await Product.find({
      reviews: { $size: countValue },
    });

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products with exactly ${countValue} reviews`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

export default router;