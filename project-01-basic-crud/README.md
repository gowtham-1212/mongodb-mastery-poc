# Project 01: Basic CRUD & Operators (Express.js + Mongoose)

## Overview

This project implements a **production-grade E-Commerce Inventory & User Management System** using Express.js and Mongoose. It exposes all fundamental MongoDB operators through clean REST API endpoints, allowing developers to understand and practice each operator class in isolation.

---

## 🎯 Learning Objectives

Master the core MongoDB query and update operators:

1. **Comparison Operators** - Filter documents by value ranges
2. **Logical Operators** - Combine multiple conditions (AND, OR, NOT)
3. **Element Operators** - Check field existence and data types
4. **Array Operators** - Query and manipulate array fields
5. **Update Operators** - Modify documents atomically

---

## 🏗 Architecture

```
Express.js Application
├── Routes (5 operator categories)
├── Models (User, Product)
├── Middleware (error handling)
├── Config (MongoDB connection)
└── Types (TypeScript interfaces)
```

### Why Express.js?

Express was chosen for this foundational project because:
- **Unopinionated**: No framework conventions obscuring MongoDB driver calls
- **Minimal abstraction**: Direct interaction with Mongoose models
- **Low learning curve**: Focus remains on MongoDB operators, not framework patterns
- **Lightweight**: Suitable for learning without unnecessary overhead

---

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your MongoDB URI
# Default: mongodb://localhost:27017/ecommerce-inventory
```

### Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build && npm start
```

Visit `http://localhost:3001/health` to confirm server is running.

---

## 🚀 API Endpoints Reference

### Comparison Operators: `$eq`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$ne`

#### **$gt (Greater Than)**

**Endpoint:** `GET /api/comparison/products-by-price?operator=gt&price=50`

**Use Case:** Find all products priced above a certain threshold.

**Technical Rationale:**
- Comparison operators are the foundation of MongoDB queries
- `$gt` returns documents where field > specified value
- Essential for price ranges, timestamps, numeric thresholds

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "sku": "LAPTOP001",
      "name": "Gaming Laptop",
      "price": 1299.99,
      "category": "electronics"
    }
  ],
  "count": 1,
  "message": "Found 1 products",
  "timestamp": "2024-06-23T10:30:00Z"
}
```

---

#### **$gte, $lt, $lte (Greater/Less Than or Equal)**

**Endpoint:** `GET /api/comparison/products-by-price?operator=gte&price=100`

**Technical Rationale:**
- `$gte` includes the boundary value (>=)
- `$lt` and `$lte` find lower bounds
- Combined, they create range queries: `{price: {$gte: 100, $lte: 500}}`

---

#### **$in (In Array)**

**Endpoint:** `GET /api/comparison/products-in-categories?categories=electronics,books,toys`

**Use Case:** Find products in ANY of specified categories.

**Technical Rationale:**
- `$in` matches documents where field equals ANY value in an array
- Superior to multiple `$or` conditions for performance
- MongoDB can use array indexes on `$in` queries

**Example Query (Internal):**
```javascript
{ category: { $in: ["electronics", "books", "toys"] } }
```

---

#### **$nin (Not In)**

**Endpoint:** `GET /api/comparison/products-not-in-categories?categories=discontinued,archived`

**Use Case:** Exclude products from specific categories (find active inventory).

**Technical Rationale:**
- `$nin` is the inverse of `$in`
- Returns documents where field does NOT match any value in array
- Useful for exclusion-based filtering

---

#### **$eq (Equal) & $ne (Not Equal)**

**Endpoint:** `GET /api/comparison/users-by-age?operator=eq&age=25`

**Technical Rationale:**
- `$eq` explicitly matches exact value (implicit in `{ field: value }`)
- `$ne` returns documents where field != value
- Valuable for programmatic query construction

---

### Logical Operators: `$and`, `$or`, `$not`, `$nor`

#### **$and (All Conditions True)**

**Endpoint:** `POST /api/logical/users-and`

**Body:**
```json
{
  "isActive": true,
  "hasNewsletterPref": true
}
```

**Use Case:** Find users who are BOTH active AND opted into newsletters.

**Technical Rationale:**
- MongoDB treats multiple conditions as implicit AND
- Explicit `$and` necessary for complex nested conditions
- When same field appears multiple times with different operators

**Example Query:**
```javascript
{
  $and: [
    { isActive: true },
    { "preferences.newsletter": true }
  ]
}
```

---

#### **$or (Any Condition True)**

**Endpoint:** `POST /api/logical/products-or`

**Body:**
```json
{
  "categories": ["electronics", "books"]
}
```

**Use Case:** Find products in electronics OR books categories.

**Technical Rationale:**
- Returns documents matching ANY condition
- Less efficient than `$in` for single field, but essential for multi-field OR
- Example: Find by email OR phone number

**Example Query (Multi-Field OR):**
```javascript
{
  $or: [
    { email: "user@example.com" },
    { phone: "555-1234" }
  ]
}
```

---

#### **$not (Negate Comparison)**

**Endpoint:** `POST /api/logical/products-not`

**Body:**
```json
{
  "minPrice": 100,
  "maxPrice": 500
}
```

**Use Case:** Find products OUTSIDE mid-range pricing.

**Technical Rationale:**
- `$not` negates a comparison operator expression
- Different from `$ne`: $ne is for equality, $not for any operator
- Returns documents where condition is FALSE

---

#### **$nor (None of the Conditions True)**

**Endpoint:** `POST /api/logical/users-nor`

**Body:**
```json
{
  "isActive": false,
  "hasNotificationsPref": false
}
```

**Use Case:** Find disengaged users (NOT active AND NOT opted-in to notifications).

**Technical Rationale:**
- `$nor` is equivalent to: NOT (condition1 OR condition2)
- Returns documents where NONE of the conditions are true
- Useful for finding "outlier" documents

---

### Element Operators: `$exists`, `$type`

#### **$exists (Field Presence Check)**

**Endpoint:** `GET /api/element/users-with-preferences?exists=true`

**Use Case:** Find users who have provided preference settings (data completeness audit).

**Technical Rationale:**
- `$exists: true` finds documents where field exists (even if null)
- `$exists: false` finds documents where field is missing
- Different from null checks: `{ field: null }` matches existing null values

**Index Consideration:**
- Create index on frequently checked fields: `db.users.createIndex({ preferences: 1 })`

---

#### **$type (BSON Type Checking)**

**Endpoint:** `POST /api/element/products-by-type`

**Body:**
```json
{
  "field": "price",
  "expectedType": "number"
}
```

**Use Case:** Data validation - ensure product prices are stored as numbers, not strings.

**Technical Rationale:**
- `$type` checks BSON type (not JavaScript typeof)
- Critical for systems ingesting external/migrated data
- Prevent type mismatches causing calculation errors

**BSON Type Reference:**
```
'number'    = 1 (int32, int64, double)
'string'    = 2
'object'    = 3
'array'     = 4
'objectId'  = 7
'bool'      = 8
'date'      = 9
'null'      = 10
```

---

### Array Operators: `$all`, `$elemMatch`, `$size`

#### **$all (All Array Elements Match)**

**Endpoint:** `POST /api/array/products-with-all-tags`

**Body:**
```json
{
  "tags": ["sale", "featured"]
}
```

**Use Case:** Find products that are simultaneously on sale AND featured.

**Technical Rationale:**
- `$all` returns documents where array contains ALL specified elements
- Different from `$in`: $in matches ANY element
- Cannot use array indexes efficiently, but still optimized

**Example:**
```javascript
// Product with tags: ["sale", "featured", "electronics"]
// MATCHES: { tags: { $all: ["sale", "featured"] } }
// Does NOT match: { tags: { $all: ["sale", "discontinued"] } }
```

---

#### **$elemMatch (Array Element Multi-Criteria Match)**

**Endpoint:** `POST /api/array/products-by-reviews-criteria`

**Body:**
```json
{
  "minRating": 4,
  "userIdMustExist": true
}
```

**Use Case:** Find products with high-quality reviews FROM verified users.

**Technical Rationale:**
- `$elemMatch` finds documents where SINGLE array element satisfies ALL conditions
- Critical for nested object arrays where multiple criteria apply to same object
- Example: Product has 2 reviews - one 5-star from verified user, one 2-star from anonymous
  - Query finds product because review1 satisfies both criteria simultaneously

**Difference from $all:**
```javascript
// $all - any array elements meeting criteria
{ tags: { $all: ["sale", "featured"] } }
// Matches if array has both elements anywhere

// $elemMatch - single element meeting all criteria
{ reviews: { $elemMatch: { rating: {$gte: 4}, userId: {$exists: true} } } }
// Matches only if one review object has BOTH high rating AND verified userId
```

---

#### **$size (Array Element Count)**

**Endpoint:** `GET /api/array/users-with-tag-count?count=3`

**Use Case:** Find users with exactly 3 tags.

**Technical Rationale:**
- `$size` matches documents where array has exact number of elements
- Only supports exact match, no range operators ($gt, $lt)
- **Performance Warning:** $size does NOT use indexes efficiently

**Performance Alternative (Denormalization):**
```javascript
// Store array length separately
{ 
  tags: ["vip", "premium", "early-adopter"],
  tagCount: 3  // ← index this instead
}
// Query: { tagCount: { $gte: 3 } } // fast!
```

---

### Update Operators: `$set`, `$unset`, `$inc`, `$push`, `$pull`, `$addToSet`

#### **$set (Update Field Value)**

**Endpoint:** `PATCH /api/update/users/:userId/set-preferences`

**Body:**
```json
{
  "newsletter": true,
  "notifications": false
}
```

**Use Case:** User updates email preferences.

**Technical Rationale:**
- `$set` updates one or more fields
- Creates field if doesn't exist (upsert capability)
- Only writes changed fields to disk (efficient)
- Atomic operation

---

#### **$unset (Remove Field)**

**Endpoint:** `PATCH /api/update/users/:userId/unset-field?field=preferences`

**Use Case:** User deletes their preferences completely (remove field from document).

**Technical Rationale:**
- `$unset` removes field key entirely (not just setting to null)
- Reduces document BSON size
- Useful for sparse data cleanup

**Difference:**
```javascript
// $set to null - field exists with null value
{ $set: { preferences: null } }
// Result: { ..., preferences: null }

// $unset - field completely removed
{ $unset: { preferences: 1 } }
// Result: { ... } (preferences key gone)
```

---

#### **$inc (Increment Numeric Field)**

**Endpoint:** `PATCH /api/update/products/:productId/adjust-quantity`

**Body:**
```json
{
  "adjustment": -5
}
```

**Use Case:** Inventory management - deduct units after sale or add units after restock.

**Technical Rationale:**
- `$inc` increments field by specified amount (positive or negative)
- **Atomic operation** - critical for high-concurrency inventory
- Prevents lost updates from concurrent requests

**Why Atomic?**
```javascript
// Without $inc (RACE CONDITION RISK)
const product = await Product.findById(id);
product.quantity -= 5;
await product.save();
// If 2 requests simultane, both read old quantity

// With $inc (ATOMIC)
await Product.updateOne({ _id: id }, { $inc: { quantity: -5 } });
// Database ensures no lost updates, even with 100 concurrent requests
```

---

#### **$push (Append to Array)**

**Endpoint:** `PATCH /api/update/products/:productId/add-review`

**Body:**
```json
{
  "userId": "user123",
  "rating": 5,
  "comment": "Excellent!"
}
```

**Use Case:** Add customer review to product's reviews array.

**Technical Rationale:**
- `$push` appends element to array field
- Creates array if field doesn't exist
- Atomic operation
- Can use `$each` modifier to push multiple elements at once

---

#### **$pull (Remove from Array)**

**Endpoint:** `PATCH /api/update/users/:userId/remove-tag`

**Body:**
```json
{
  "tag": "vip"
}
```

**Use Case:** Revoke a tag from user (e.g., remove "vip" status).

**Technical Rationale:**
- `$pull` removes ALL occurrences of value from array
- Not just the first element
- Can use complex conditions: `{ $pull: { comments: { spam: true } } }`

---

#### **$addToSet (Add to Array if Unique)**

**Endpoint:** `PATCH /api/update/users/:userId/add-tag`

**Body:**
```json
{
  "tag": "premium"
}
```

**Use Case:** Add tag to user, preventing duplicates.

**Technical Rationale:**
- `$addToSet` adds element ONLY if it doesn't already exist (set semantics)
- Prevents duplicate values in array
- More efficient than application-level duplicate checking

**Difference from $push:**
```javascript
// $push - always adds
{ $push: { tags: "vip" } }
// Result: ["vip", "premium", "vip"] ← duplicates allowed

// $addToSet - prevents duplicates
{ $addToSet: { tags: "vip" } }
// If "vip" exists, nothing happens
// Result: ["vip", "premium"]
```

---

## 📊 Database Schema

### User Collection

```typescript
{
  _id: ObjectId,
  email: string (unique),
  name: string,
  age: number,
  isActive: boolean,
  tags: [string],
  preferences: {
    newsletter: boolean,
    notifications: boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Product Collection

```typescript
{
  _id: ObjectId,
  sku: string (unique),
  name: string,
  price: number,
  quantity: number,
  category: string,
  isActive: boolean,
  tags: [string],
  reviews: [{
    userId: string,
    rating: number (1-5),
    comment: string
  }],
  metadata: {
    weight: number,
    dimensions: {
      length: number,
      width: number,
      height: number
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing the API

### Using cURL

```bash
# Comparison operator
curl "http://localhost:3001/api/comparison/products-by-price?operator=gt&price=100"

# Logical operator
curl -X POST http://localhost:3001/api/logical/users-and \
  -H "Content-Type: application/json" \
  -d '{"isActive": true, "hasNewsletterPref": true}'

# Element operator
curl "http://localhost:3001/api/element/users-with-preferences?exists=true"

# Array operator
curl -X POST http://localhost:3001/api/array/products-with-all-tags \
  -H "Content-Type: application/json" \
  -d '{"tags": ["sale", "featured"]}'

# Update operator
curl -X PATCH http://localhost:3001/api/update/users/USER_ID/add-tag \
  -H "Content-Type: application/json" \
  -d '{"tag": "premium"}'
```

### Using Postman/Insomnia

Import the collection endpoints provided in the route files.

---

## 🔒 Best Practices Implemented

✅ **Type Safety** - Full TypeScript with explicit interfaces  
✅ **Error Handling** - Standardized JSON error responses  
✅ **Async/Await** - Modern async patterns with try-catch  
✅ **Graceful Shutdown** - Proper cleanup on process termination  
✅ **Environment Management** - No hardcoded credentials  
✅ **MongoDB Connection Pooling** - Configurable pool sizes  
✅ **Security** - Helmet.js for HTTP headers, CORS configured  

---

## 📈 Next Steps

1. **Project 02** - Learn advanced Aggregation Framework with Fastify.js
2. **Project 03** - Master Indexing & Performance Tuning with NestJS
3. **Production Deployment** - Deploy these patterns to cloud MongoDB Atlas

---

## 📝 License

MIT

## Swagger API Documentation

A Swagger UI is available for the full Project 01 API contract.

- Start the app:
  ```bash
  npm run dev
```

## Monorepo Package Configuration

This repository uses a multi-package monorepo layout.

### Root `package.json`

The root `package.json` is the monorepo manifest.

- `private: true` prevents accidental publishing of the root package.
- `workspaces` declares the local subprojects:
  - `project-01-basic-crud`
  - `project-02-aggregation`
  - `project-03-indexing`
- Root scripts can operate across all workspaces, for example:
  - `npm install`
  - `npm run build --workspaces`
  - `npm run dev --workspaces`

This file is also sometimes called the workspace root manifest.

### Subproject `package.json`

Each subproject has its own `package.json` file.

- Defines dependencies specific to that subproject
- Defines local scripts like `dev`, `build`, `start`
- Contains package metadata such as `name`, `version`, `description`, and `keywords`

This file is the package manifest for that workspace service.

### Why this structure?

- Keeps each service isolated
- Enables shared dependency installation and hoisting
- Makes project-specific scripts self-contained
- Supports different frameworks per service while still managing the repo centrally

### Terminology

- `package.json` = package manifest
- root `package.json` = monorepo root manifest
- `workspaces` = npm workspace configuration
- `keywords` = npm package metadata tags

### Technically:

package.json at the repository root is the monorepo root manifest.

- It defines the workspace itself.
- It contains the root-level workspaces property.
- It is used by npm/yarn/pnpm to manage multiple packages together.
- It is usually marked private: true to prevent publishing the root as a package.
- package.json is a workspace package manifest.

- It defines the individual subproject.
- It contains local dependencies, scripts, and metadata for that specific service.
- Each project in the monorepo has its own package manifest.

What is workspaces?
- workspaces is an npm/yarn feature.
- It tells the package manager: “These folders are separate packages, but should be installed and linked together as one repo.”
- Technically this makes the repo a workspace monorepo.

Use case:
- install dependencies from all subprojects in one command
- share packages between workspaces
- enable root-level scripts to run across all packages (npm run build --workspaces)
- allow dependency hoisting to reduce duplication

Example from root package.json:
{
  "private": true,
  "workspaces": [
    "project-01-basic-crud",
    "project-02-aggregation",
    "project-03-indexing"
  ]
}

What is keywords?
- keywords is npm package metadata.
- In a package manifest it is a list of tags that describe the package.
- Technically it is part of the npm package metadata schema.

Use case:
- makes the package easier to discover in npm search
- documents the package purpose
- helps IDEs and tools understand the package domain

Example:
"keywords": [
  "mongodb",
  "express",
  "fastify",
  "nestjs",
  "typescript",
  "learning"
]
