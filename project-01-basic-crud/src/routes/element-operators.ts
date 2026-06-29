/**
 * Element Operators Route
 * 
 * Demonstrates: $exists, $type
 * 
 * USE CASES:
 * - $exists: Find users who have NOT provided optional fields (email newsletter preference)
 * - $type: Find products with specific field data types (ensure numeric prices)
 */

import { Router, Request, Response } from 'express';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { QueryResponse } from '../types/index';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/element/users-with-preferences
 * 
 * Query Parameters:
 * - exists: 'true' | 'false'
 * 
 * Example: GET /api/element/users-with-preferences?exists=true
 * 
 * TECHNICAL RATIONALE:
 * $exists checks if a field is present in a document.
 * $exists: true finds documents where the field exists (even if null).
 * $exists: false finds documents where the field is missing.
 * 
 * USE CASE: Find users who haven't set preferences yet (data completeness audit).
 * PERFORMANCE: Index on 'preferences' field will speed up this query.
 */
router.get(
  '/users-with-preferences',
  asyncHandler(async (req: Request, res: Response) => {
    const { exists } = req.query;

    if (!exists) {
      throw new AppError('Missing required parameter: exists (true/false)', 400);
    }

    const existsValue = exists === 'true';

    const users = await User.find({
      preferences: { $exists: existsValue },
    });

    const response: QueryResponse<typeof users> = {
      success: true,
      data: users,
      count: users.length,
      message: `Found ${users.length} users where preferences ${existsValue ? 'exists' : 'does not exist'}`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/element/products-missing-metadata
 * 
 * Finds all products that don't have metadata information filled in.
 * Useful for inventory audits to identify incomplete product records.
 * 
 * TECHNICAL RATIONALE:
 * $exists: false identifies sparse data that might need completion.
 * Combined with isActive: true to prioritize active products.
 */
router.get(
  '/products-missing-metadata',
  asyncHandler(async (req: Request, res: Response) => {
    const products = await Product.find({
      metadata: { $exists: false },
      isActive: true,
    });

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} active products missing metadata`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * POST /api/element/products-by-type
 * 
 * Body: { field: 'price' | 'quantity', expectedType: 'number' | 'string' | 'objectId' }
 * 
 * Example:
 * {
 *   "field": "price",
 *   "expectedType": "number"
 * }
 * 
 * TECHNICAL RATIONALE:
 * $type checks if a field matches a specific BSON data type.
 * MongoDB type numbers: 'number' = 1, 'string' = 2, 'objectId' = 7, 'array' = 4, etc.
 * 
 * USE CASE: Data type validation. Find products where price was accidentally stored as string.
 * This is critical in production systems migrating or accepting external data.
 * 
 * COMMON BSON TYPES:
 * - 'number' (includes int, long, double)
 * - 'string'
 * - 'object'
 * - 'array'
 * - 'objectId'
 * - 'bool'
 * - 'date'
 * - 'null'
 */
router.post(
  '/products-by-type',
  asyncHandler(async (req: Request, res: Response) => {
    const { field, expectedType } = req.body;

    if (!field || !expectedType) {
      throw new AppError('Missing required parameters: field, expectedType', 400);
    }

    const typeMap: Record<string, string | number> = {
      number: 1,
      string: 2,
      object: 3,
      array: 4, 
      objectId: 7,
      bool: 8,
      date: 9,
      null: 10,
    };

    if (!typeMap[expectedType]) {
      throw new AppError(
        `Invalid type. Allowed: ${Object.keys(typeMap).join(', ')}`,
        400
      );
    }

    const query: Record<string, object> = {};
    query[field] = { $type: typeMap[expectedType] };

    console.log("query", query)

    const products = await Product.find(query);

    const response: QueryResponse<typeof products> = {
      success: true,
      data: products,
      count: products.length,
      message: `Found ${products.length} products where ${field} is of type ${expectedType}`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

/**
 * GET /api/element/users-by-type
 * 
 * Query Parameters:
 * - field: document field to check
 * - type: BSON type name
 * 
 * Example: GET /api/element/users-by-type?field=email&type=string
 * 
 * TECHNICAL RATIONALE:
 * Validates that user email is stored as string (should always be true, but defensive programming).
 */
router.get(
  '/users-by-type',
  asyncHandler(async (req: Request, res: Response) => {
    const { field, type } = req.query;

    if (!field || !type) {
      throw new AppError('Missing required parameters: field, type', 400);
    }

    const typeMap: Record<string, string | number> = {
      number: 1,
      string: 2,
      object: 3,
      array: 4,
      objectId: 7,
      bool: 8,
      date: 9,
      null: 10,
    };

    if (!typeMap[type as string]) {
      throw new AppError(
        `Invalid type. Allowed: ${Object.keys(typeMap).join(', ')}`,
        400
      );
    }

    const query: Record<string, object> = {};
    query[field as string] = { $type: typeMap[type as string] };

    const users = await User.find(query);

    const response: QueryResponse<typeof users> = {
      success: true,
      data: users,
      count: users.length,
      message: `Found ${users.length} users where ${field} is of type ${type}`,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  })
);

export default router;