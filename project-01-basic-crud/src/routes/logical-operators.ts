/**
 * Logical Operators Route
 * 
 * Demonstrates: $and, $or, $not, $nor
 * 
 * USE CASES:
 * - $and: Find users who are active AND have newsletter preference enabled
 * - $or: Find products in electronics OR books category
 * - $not: Find products where price is NOT between 100-500
 * - $nor: Find users who are NOT active AND NOT premium members
 */

import { Router, Request, Response } from 'express';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { QueryResponse } from '../types/index';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/logical/users-and
 * 
 * Body: { isActive: boolean, hasNewsletterPref: boolean }
 * 
 * Example:
 * {
 *   "isActive": true,
 *   "hasNewsletterPref": true
 * }
 * 
 * TECHNICAL RATIONALE:
 * $and explicitly combines multiple conditions where ALL must be true.
 * While implicit AND (multiple conditions in object) works,
 * explicit $and is valuable for complex nested conditions or when
 * the same field appears multiple times with different operators.
 * 
 * PERFORMANCE NOTE:
 * For simple conditions, MongoDB optimizes implicit AND better.
 * Use explicit $and for programmatic query construction.
 */
router.post(
  '/users-and',
  asyncHandler(async (req: Request, res: Response) => {
    const { isActive, hasNewsletterPref } = req.body;

    if (typeof isActive !== 'boolean' || typeof hasNewsletterPref !== 'boolean') {
      throw new AppError('Both isActive and hasNewsletterPref must be boolean', 400);
    }

    const users = await User.find({
      $and: [
        { isActive },
        { 'preferences.newsletter': hasNewsletterPref },
      ],
    });

    const response: QueryResponse<typeof users> = {
      success: true,
      data: users,
      count: users.length,
      message: `Found ${users.length} users matching both conditions`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * POST /api/logical/products-or
 * 
 * Body: { categories: string[] }
 * 
 * Example:
 * {
 *   "categories": ["electronics", "books"]
 * }
 * 
 * TECHNICAL RATIONALE:
 * $or returns documents where ANY condition is true.
 * This example shows $or combined with $in for flexible querying.
 * $or is less efficient than $in for the same field, but essential
 * when matching different fields (e.g., find by SKU OR product name).
 */
router.post(
  '/products-or',
  asyncHandler(async (req: Request, res: Response) => {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      throw new AppError('categories must be a non-empty array', 400);
    }

    const products = await Product.find({
      $or: [{ category: { $in: categories } }, { isActive: true }],
    });

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products matching any condition`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * POST /api/logical/:
 * 
 * Body: { minPrice: number, maxPrice: number }
 * 
 * Example:
 * {
 *   "minPrice": 100,
 *   "maxPrice": 500
 * }
 * 
 * TECHNICAL RATIONALE:
 * $not is a prefix operator that negates a comparison condition.
 * Find products whose price is NOT between 100-500.
 * Different from $ne: $ne is used for equality, $not negates ANY operator expression.
 * 
 * USE CASE: "Show me products outside the mid-range price bracket"
 */
router.post(
  '/products-not',
  asyncHandler(async (req: Request, res: Response) => {
    const { minPrice, maxPrice } = req.body;

    if (typeof minPrice !== 'number' || typeof maxPrice !== 'number') {
      throw new AppError('minPrice and maxPrice must be numbers', 400);
    }

    const products = await Product.find({
      price: {
        $not: {
          $gte: minPrice,
          $lte: maxPrice,
        },
      },
    });

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products outside price range`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * POST /api/logical/users-nor
 * 
 * Body: { isActive: boolean, hasNotificationsPref: boolean }
 * 
 * Example:
 * {
 *   "isActive": false,
 *   "hasNotificationsPref": false
 * }
 * 
 * TECHNICAL RATIONALE:
 * $nor returns documents where NONE of the conditions are true.
 * This is equivalent to: NOT (condition1 OR condition2)
 * Use case: Find users who are NOT active AND have NOT enabled notifications
 * (possibly disengaged users for re-engagement campaigns).
 * 
 * PERFORMANCE NOTE:
 * $nor is less commonly used but valuable for exclusion-based queries.
 * MongoDB optimizes $nor queries similarly to other logical operators.
 */
router.post(
  '/users-nor',
  asyncHandler(async (req: Request, res: Response) => {
    const { isActive, hasNotificationsPref } = req.body;

    if (typeof isActive !== 'boolean' || typeof hasNotificationsPref !== 'boolean') {
      throw new AppError('Both parameters must be boolean', 400);
    }

    const users = await User.find({
      $nor: [{ isActive }, { 'preferences.notifications': hasNotificationsPref }],
    });

    const response: QueryResponse<typeof users> = {
      success: true,
      data: users,
      count: users.length,
      message: `Found ${users.length} users matching nor condition`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

export default router;