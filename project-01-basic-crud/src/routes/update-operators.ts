/**
 * Update Operators Route
 * 
 * Demonstrates: $set, $unset, $inc, $push, $pull, $addToSet
 * 
 * USE CASES:
 * - $set: Update user profile fields
 * - $unset: Remove optional fields from documents
 * - $inc: Increment product quantity or inventory counters
 * - $push: Add review to product reviews array
 * - $pull: Remove tag from user tags array
 * - $addToSet: Add tag to user (prevent duplicates)
 */

import { Router, Request, Response } from 'express';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { QueryResponse } from '../types/index';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @openapi
 * /api/update/users/{userId}/set-preferences:
 *   patch:
 *     tags:
 *       - Update
 *     summary: Update user preference settings
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetPreferencesBody'
 *     responses:
 *       '200':
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QueryResponseObject'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardError'
 */
/**
 * PATCH /api/update/users/:userId/set-preferences
 * 
 * Body: { newsletter: boolean, notifications: boolean }
 * 
 * Example:
 * {
 *   "newsletter": true,
 *   "notifications": false
 * }
 * 
 * TECHNICAL RATIONALE:
 * $set updates one or more fields in a document.
 * If fields don't exist, $set creates them (upsert capability).
 * If fields exist, $set overwrites their values.
 * 
 * USE CASE: User updates email preferences.
 * 
 * PERFORMANCE: $set only writes changed fields to disk, efficient for partial updates.
 */
router.patch(
  '/users/:userId/set-preferences',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { newsletter, notifications } = req.body;

    if (typeof newsletter !== 'boolean' || typeof notifications !== 'boolean') {
      throw new AppError('newsletter and notifications must be boolean', 400);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'preferences.newsletter': newsletter,
          'preferences.notifications': notifications,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    const response: QueryResponse<typeof updatedUser> = {
      success: true,
      data: updatedUser,
      message: 'User preferences updated successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * PATCH /api/update/users/:userId/unset-field
 * 
 * Query Parameters:
 * - field: field name to remove
 * 
 * Example: PATCH /api/update/users/123/unset-field?field=preferences
 * 
 * TECHNICAL RATIONALE:
 * $unset removes a field from a document entirely (not just setting to null).
 * Setting to null leaves the field with null value; $unset removes the field key.
 * 
 * USE CASE: User deletes their preferences, completely removing the field from the document.
 * Reduces document size when field is no longer needed.
 * 
 * PERFORMANCE: Reduces document BSON size, improves read performance for unrelated fields.
 */
router.patch(
  '/users/:userId/unset-field',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { field } = req.query;

    if (!field) {
      throw new AppError('Missing required query parameter: field', 400);
    }

    const unsetQuery: Record<string, number> = {};
    unsetQuery[field as string] = 1;

    console.log(unsetQuery, "unsetQuery")

    const updatedUser = await User.findByIdAndUpdate(userId, { $unset: unsetQuery }, { new: true });

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    const response: QueryResponse<typeof updatedUser> = {
      success: true,
      data: updatedUser,
      message: `Field '${field}' removed from user`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * PATCH /api/update/products/:productId/adjust-quantity
 * 
 * Body: { adjustment: number }
 * 
 * Example:
 * {
 *   "adjustment": -5
 * }
 * (Deduct 5 units from inventory)
 * 
 * TECHNICAL RATIONALE:
 * $inc increments a numeric field by a specified value.
 * Works with positive and negative values.
 * Atomic operation: ideal for high-concurrency inventory systems.
 * 
 * USE CASE: Update product inventory after sale or restock.
 * Two concurrent requests incrementing simultaneously are handled atomically,
 * preventing lost updates (unlike read-modify-write pattern).
 * 
 * PERFORMANCE: Atomic at database level, no race conditions.
 */
router.patch(
  '/products/:productId/adjust-quantity',
  asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { adjustment } = req.body;

    if (typeof adjustment !== 'number') {
      throw new AppError('adjustment must be a number', 400);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: adjustment } },
      { new: true }
    );

    if (!updatedProduct) {
      throw new AppError('Product not found', 404);
    }

    const response: QueryResponse<typeof updatedProduct> = {
      success: true,
      data: updatedProduct,
      message: `Product quantity adjusted by ${adjustment}`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * PATCH /api/update/products/:productId/add-review
 * 
 * Body: { userId: string, rating: number (1-5), comment: string }
 * 
 * Example:
 * {
 *   "userId": "user123",
 *   "rating": 5,
 *   "comment": "Excellent product!"
 * }
 * 
 * TECHNICAL RATIONALE:
 * $push appends an element to an array field.
 * Creates array if field doesn't exist.
 * If array is full (cap specified), removes oldest element (FIFO behavior).
 * 
 * USE CASE: Add customer review to product's reviews array.
 * 
 * PERFORMANCE: Efficient for appending to arrays, doesn't re-read entire array.
 * With $each modifier, can push multiple elements atomically.
 */
router.patch(
  '/products/:productId/add-review',
  asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { userId, rating, comment } = req.body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new AppError('rating must be a number between 1 and 5', 400);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $push: {
          reviews: {
            userId,
            rating,
            comment,
          },
        },
      },
      { new: true }
    );

    if (!updatedProduct) {
      throw new AppError('Product not found', 404);
    }

    const response: QueryResponse<typeof updatedProduct> = {
      success: true,
      data: updatedProduct,
      message: 'Review added successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * PATCH /api/update/users/:userId/remove-tag
 * 
 * Body: { tag: string }
 * 
 * Example:
 * {
 *   "tag": "vip"
 * }
 * 
 * TECHNICAL RATIONALE:
 * $pull removes all occurrences of a value from an array field.
 * If multiple identical elements exist, ALL are removed (not just one).
 * 
 * USE CASE: Remove a tag from user's tag list (e.g., revoke "vip" status).
 * 
 * PERFORMANCE: Efficient array modification, indexes still work after pull.
 */
router.patch(
  '/users/:userId/remove-tag',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { tag } = req.body;

    if (typeof tag !== 'string') {
      throw new AppError('tag must be a string', 400);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { tags: tag } },
      { new: true }
    );

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    const response: QueryResponse<typeof updatedUser> = {
      success: true,
      data: updatedUser,
      message: `Tag '${tag}' removed from user`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * PATCH /api/update/users/:userId/add-tag
 * 
 * Body: { tag: string }
 * 
 * Example:
 * {
 *   "tag": "premium"
 * }
 * 
 * TECHNICAL RATIONALE:
 * $addToSet adds an element to an array field ONLY if it doesn't already exist.
 * Prevents duplicate values in the array.
 * Creates array if field doesn't exist.
 * 
 * DIFFERENCE FROM $push:
 * - $push: Always adds element (allows duplicates)
 * - $addToSet: Adds only if element doesn't exist (set semantics)
 * 
 * USE CASE: Add tag to user (e.g., "premium", "verified", "early-adopter").
 * Prevents accidental duplicate tag entries.
 * 
 * PERFORMANCE: $addToSet performs uniqueness check before insertion.
 * Efficient for small arrays; for very large arrays, use indexed unique constraint instead.
 */
router.patch(
  '/users/:userId/add-tag',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { tag } = req.body;

    if (typeof tag !== 'string') {
      throw new AppError('tag must be a string', 400);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { tags: tag } },
      { new: true }
    );

    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }

    const response: QueryResponse<typeof updatedUser> = {
      success: true,
      data: updatedUser,
      message: `Tag '${tag}' added to user`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

export default router;