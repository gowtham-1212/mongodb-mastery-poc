# Project 03: Indexing, Optimization & Profiling

## Overview

This project uses **NestJS 10.3.0** with the native MongoDB driver (**6.3.0**) to demonstrate all index types and query profiling with execution statistics.

Routes are implemented in separate controller files for each index type, with real-time execution metrics including scan types (COLLSCAN vs IXSCAN), documents examined, and efficiency ratios.

## Run locally

```bash
cd project-03-indexing
npm install
chmod +x seed.sh
./seed.sh
npm run dev
```

Open:
- `http://localhost:3020/indexes/single-field`
- `http://localhost:3020/indexes/compound`
- `http://localhost:3020/indexes/multikey`
- `http://localhost:3020/indexes/text`
- `http://localhost:3020/indexes/hashed`
- `http://localhost:3020/indexes/wildcard`
- `http://localhost:3020/indexes/ttl`
- `http://localhost:3020/indexes/sparse`
- `http://localhost:3020/indexes/geospatial`
- `http://localhost:3020/indexes/partial`
- `http://localhost:3020/indexes/clustered`

---

## Index Types & Use Cases

### 1. **Single-Field Index**

- **Definition**: Index on a single collection field with ascending (1) or descending (-1) order.
- **Use Case**: Direct product lookups by SKU, email searches, user ID queries.
- **Scan Type**: `IXSCAN` (Index Scan)
- **Efficiency**: Perfect 1:1 ratio (1 doc examined = 1 key scanned)
- **Route**: `GET /indexes/single-field`

```javascript
db.products.createIndex({ sku: 1 }, { name: 'idx_products_sku_1' })
```

---

### 2. **Compound Index**

- **Definition**: Index on multiple fields, respecting field order and direction.
- **Use Case**: Category-based price range queries with sorting, user email + status lookups.
- **Scan Type**: `IXSCAN` (Index Scan)
- **Efficiency**: Handles both filter and sort in single index traversal.
- **Route**: `GET /indexes/compound`

```javascript
db.products.createIndex(
  { category: 1, price: -1 },
  { name: 'idx_products_category_price' }
)
```

---

### 3. **Multikey Index**

- **Definition**: Index automatically created on array fields; creates index entry for each array element.
- **Use Case**: Tag-based searches, keyword matching, array membership queries.
- **Scan Type**: `IXSCAN` (Index Scan)
- **Efficiency**: Each array element is indexed separately.
- **Route**: `GET /indexes/multikey`

```javascript
db.products.createIndex({ tags: 1 }, { name: 'idx_products_tags' })
// Document: { tags: ['storage', 'portable', 'analytics'] }
// Index creates entries for each tag
```

---

### 4. **Text Index**

- **Definition**: Full-text search index supporting linguistic stemming and phrase search.
- **Use Case**: Product description search, document content search, keyword matching.
- **Scan Type**: `IXSCAN` (Index Scan)
- **Supports**: `$text` operator, language-specific analysis.
- **Route**: `GET /indexes/text`

```javascript
db.products.createIndex(
  { description: 'text' },
  { name: 'idx_products_description_text' }
)
// Query: db.products.find({ $text: { $search: 'portable' } })
```

---

### 5. **Hashed Index**

- **Definition**: Index using hash function for even distribution; cannot support range queries.
- **Use Case**: High-cardinality equality lookups, sharding key distribution.
- **Scan Type**: `IXSCAN` (Index Scan)
- **Limitation**: Cannot be used for range queries ($gt, $lt, $gte, $lte).
- **Route**: `GET /indexes/hashed`

```javascript
db.products.createIndex({ userId: 'hashed' }, { name: 'idx_products_userId_hashed' })
```

---

### 6. **Wildcard Index**

- **Definition**: Index on all subfields of a nested document without explicit index for each field.
- **Use Case**: Dynamic nested field queries, metadata searches, flexible schema queries.
- **Scan Type**: `IXSCAN` (Index Scan)
- **Benefit**: Handles queries on unknown nested fields automatically.
- **Route**: `GET /indexes/wildcard`

```javascript
db.products.createIndex(
  { 'metadata.$**': 1 },
  { name: 'idx_products_metadata_wildcard' }
)
// Query: db.products.find({ 'metadata.channel': 'web' })
```

---

### 7. **TTL Index** (Time-To-Live)

- **Definition**: Special index that automatically removes documents after a specified time period.
- **Use Case**: Session expiration, temporary cache cleanup, log retention policies.
- **Scan Type**: `COLLSCAN` (Collection Scan) or `IXSCAN` depending on query filter.
- **Automatic**: MongoDB background task runs every 60 seconds to delete expired documents.
- **Route**: `GET /indexes/ttl`

```javascript
db.sessions.createIndex(
  { createdAt: 1 },
  { 
    name: 'idx_sessions_createdAt_ttl',
    expireAfterSeconds: 60
  }
)
```

---

### 8. **Sparse Index**

- **Definition**: Index that only includes documents containing the indexed field.
- **Use Case**: Optional fields (promotion codes, discount coupons), reducing index size.
- **Scan Type**: `IXSCAN` (Index Scan)
- **Benefit**: Smaller index size, faster index maintenance, useful for partial datasets.
- **Route**: `GET /indexes/sparse`

```javascript
db.products.createIndex(
  { promotionCode: 1 },
  { 
    name: 'idx_products_promotionCode_sparse',
    sparse: true
  }
)
```

---

### 9. **Geospatial Index** ⭐ NEW

- **Definition**: Specialized index for geographic coordinate queries using GeoJSON format.
- **Use Case**: Find nearby stores, restaurants within radius, location-based search.
- **Scan Type**: `IXSCAN` (2dsphere Index Scan)
- **Query Operators**: `$near`, `$geoWithin`, `$geoIntersects`
- **Distance**: Specified in meters; uses spherical geometry.
- **Route**: `GET /indexes/geospatial`

```javascript
db.stores.createIndex(
  { location: '2dsphere' },
  { name: 'idx_stores_location_2dsphere' }
)
// Document format:
// { 
//   location: { 
//     type: 'Point', 
//     coordinates: [-73.9857, 40.7484] 
//   } 
// }
// Query: Find stores within 5km of Times Square
db.stores.find({
  location: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [-73.9857, 40.7484]
      },
      $maxDistance: 5000  // meters
    }
  }
})
```

---

### 10. **Partial Index** ⭐ NEW

- **Definition**: Index on documents matching a filter expression; stores only subset of collection.
- **Use Case**: Index only completed orders, active users, published articles.
- **Scan Type**: `IXSCAN` (Index Scan) when filter matches; `COLLSCAN` when filter doesn't match.
- **Benefit**: Smaller index size (saves ~50%), faster writes, improved memory efficiency.
- **Filter Expression**: Supports all query operators ($gt, $lt, $eq, $exists, etc.).
- **Route**: `GET /indexes/partial` and `GET /indexes/partial/no-index`

```javascript
db.orders.createIndex(
  { userId: 1 },
  { 
    name: 'idx_orders_userId_partial_completed',
    partialFilterExpression: { status: 'completed' }
  }
)
// Query that USES index: { userId: 'alice@example.com', status: 'completed' }
// Query that SKIPS index: { userId: 'alice@example.com', status: 'pending' }
```

---

### 11. **Clustered Index** ⭐ NEW

- **Definition**: Index that physically organizes collection data around a key field (MongoDB 5.3+).
- **Use Case**: Time-series data, sequential access by date/timestamp, range queries.
- **Scan Type**: `IXSCAN` (Index Scan)
- **Benefit**: Faster range scans, better cache locality, optimized for sequential access.
- **Note**: Created at collection creation time; compound index simulates this behavior.
- **Route**: `GET /indexes/clustered`

```javascript
// Creation at collection time (MongoDB 5.3+):
db.createCollection('orders', {
  clusteredIndex: {
    key: { _id: 1 },
    unique: true
  }
})

// Or use compound index that acts like clustered:
db.orders.createIndex(
  { createdAt: 1, orderId: 1 },
  { name: 'idx_orders_clustered_createdAt' }
)
// Query: Range scan on createdAt returns sequentially ordered results
db.orders.find({
  createdAt: {
    $gte: new Date('2024-06-01'),
    $lte: new Date('2024-06-05')
  }
}).sort({ createdAt: 1 })
```

---

## MongoDB Index Architecture & Flow

### Index Creation & Storage Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Collection Documents (RAM/Disk)              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ { _id: 1, sku: 'P-1001', category: 'electronics', ... }  │  │
│  │ { _id: 2, sku: 'P-1002', category: 'furniture', ... }    │  │
│  │ { _id: 3, sku: 'P-1003', category: 'stationery', ... }   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (Index Creation Process)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Index B-Tree Structure (WiredTiger Engine)         │
│                                                                 │
│    Index on { sku: 1 }  ─ Sorted Key-Value Pairs              │
│    ┌────────────────────────────────────────────────────┐      │
│    │  Key (sku)         │  Value (RID/Position)        │      │
│    ├────────────────────┼──────────────────────────────┤      │
│    │  'P-1001'          │  → Document ID: 1 (Address)  │      │
│    │  'P-1002'          │  → Document ID: 2 (Address)  │      │
│    │  'P-1003'          │  → Document ID: 3 (Address)  │      │
│    └────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (Query Execution)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Query: { sku: 'P-1001' }                   │
│                                                                 │
│  Step 1: Binary Search in B-Tree Index                         │
│  └─> Find 'P-1001' in sorted index (O(log n) time)             │
│  └─> Get RID/Address: 1                                        │
│                                                                 │
│  Step 2: Fetch Document from Collection                        │
│  └─> Use RID to locate document in memory/disk                 │
│  └─> Return full document to application                       │
│                                                                 │
│  Step 3: Apply Remaining Filters & Projections                 │
│  └─> Filter additional conditions                              │
│  └─> Project requested fields                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Return Result Set   │
                    │ { _id: 1, sku: ... } │
                    └──────────────────────┘
```

### Index Lookup Performance Comparison

```
Without Index (COLLSCAN)          With Index (IXSCAN)
┌──────────────────────────┐      ┌──────────────────────────┐
│ 1. Sequential Scan       │      │ 1. Binary Search         │
│ 2. Check All 1M Docs     │      │ 2. Check ~1K Keys        │
│ 3. Match Filter          │      │ 3. Get RID               │
│ 4. Return Results        │      │ 4. Fetch Document        │
│                          │      │ 5. Return Results        │
│ Time: O(n)               │      │ Time: O(log n)           │
│ ~1000ms                  │      │ ~1ms                     │
└──────────────────────────┘      └──────────────────────────┘
```

### Index Storage Memory Hierarchy

```
┌────────────────────────────────────────────────────────────────┐
│                    MongoDB WiredTiger Engine                    │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          L1 CPU Cache (8KB-64KB per core)               │ │
│  │  ◄─ Fastest, holds hot index pages                     │ │
│  │  ◄─ Automatic promotion for frequent keys              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              ▲                                 │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          L2/L3 CPU Cache (256KB-20MB)                   │ │
│  │  ◄─ Medium speed, larger capacity                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              ▲                                 │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │    MongoDB Buffer Pool / Memory (RAM - Configurable)    │ │
│  │  ◄─ Caches frequently used index pages                  │ │
│  │  ◄─ LRU eviction when full                              │ │
│  │  ◄─ Default: 50% of system RAM                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              ▲                                 │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │         WiredTiger Cache (Compressed Index Pages)       │ │
│  │  ◄─ Stores compressed B-Tree nodes                      │ │
│  │  ◄─ Decompressed on access                              │ │
│  │  ◄─ Organized in 4KB-8KB pages                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              ▲                                 │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │     Persistent Storage (Disk / SSD / NVMe)              │ │
│  │  ◄─ WiredTiger data files (collection.wt, index.wt)     │ │
│  │  ◄─ Journal files for write-ahead logging               │ │
│  │  ◄─ Checkpoint files for recovery                       │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## MongoDB Single Node vs. Atlas Cluster

### 1. MongoDB Single Node

**Definition**: A standalone MongoDB instance running on a single machine/server.

```
┌─────────────────────────────────────────────┐
│         Single MongoDB Node                 │
│  (Standalone Instance)                      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    MongoDB Process (mongod)         │   │
│  │  • Port: 27017                      │   │
│  │  • Handles all reads/writes         │   │
│  │  • Single point of failure          │   │
│  │  • No replication                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    Storage Engine (WiredTiger)      │   │
│  │  • Data files (collection.wt)       │   │
│  │  • Index files (index.wt)           │   │
│  │  • Journal (recovery)               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │    Memory & Cache                   │   │
│  │  • Buffer Pool (RAM)                │   │
│  │  • Working Set (Hot Data)           │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        ▲                       ▼
     Client Connections    Network I/O
```

**Components**:
- **mongod Process**: Single database daemon handling all operations
- **WiredTiger Engine**: Storage, indexing, compression
- **Buffer Pool**: RAM cache for frequently accessed data
- **Journal & Checkpoints**: Data durability and recovery

**Characteristics**:
- ✅ Simple setup and maintenance
- ✅ Suitable for development/testing
- ❌ No automatic failover
- ❌ Single point of failure
- ❌ Limited scalability
- ❌ No built-in high availability

**Use Cases**:
- Development environments
- Prototyping and POC
- Small single-server applications
- Learning MongoDB basics

---

### 2. MongoDB Atlas Cluster

**Definition**: MongoDB's fully-managed database as a service (DBaaS) running on AWS, Azure, or GCP.

```
┌──────────────────────────────────────────────────────────────────┐
│                      MongoDB Atlas Cluster                        │
│                    (Multi-Region, High Availability)              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Replica Set (Primary + Secondaries)           │ │
│  │                                                            │ │
│  │  ┌──────────────────┐  ┌──────────────────┐              │ │
│  │  │  PRIMARY NODE    │  │ SECONDARY NODE 1 │              │ │
│  │  │  (Read/Write)    │  │  (Read-Only)     │              │ │
│  │  │                  │◄─┤ Replication      │              │ │
│  │  │  ┌────────────┐  │  │  ┌────────────┐  │              │ │
│  │  │  │ MongoDB    │  │  │  │ MongoDB    │  │              │ │
│  │  │  │ Process    │  │  │  │ Process    │  │              │ │
│  │  │  │ (mongod)   │  │  │  │ (mongod)   │  │              │ │
│  │  │  └────────────┘  │  │  └────────────┘  │              │ │
│  │  │                  │  │                  │              │ │
│  │  │  ┌────────────┐  │  │  ┌────────────┐  │              │ │
│  │  │  │WiredTiger  │  │  │  │WiredTiger  │  │              │ │
│  │  │  │+ Storage   │  │  │  │+ Storage   │  │              │ │
│  │  │  └────────────┘  │  │  └────────────┘  │              │ │
│  │  └──────────────────┘  └──────────────────┘              │ │
│  │                              │                           │ │
│  │                              │ Replication Stream        │ │
│  │                              ▼                           │ │
│  │                    ┌──────────────────┐                 │ │
│  │                    │ SECONDARY NODE 2 │                 │ │
│  │                    │  (Read-Only)     │                 │ │
│  │                    │  ┌────────────┐  │                 │ │
│  │                    │  │ MongoDB    │  │                 │ │
│  │                    │  │ Process    │  │                 │ │
│  │                    │  └────────────┘  │                 │ │
│  │                    │  ┌────────────┐  │                 │ │
│  │                    │  │WiredTiger  │  │                 │ │
│  │                    │  └────────────┘  │                 │ │
│  │                    └──────────────────┘                 │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Sharding Layer (Optional - Enterprise)        │ │
│  │                                                        │ │
│  │  ┌──────────────────┐    ┌──────────────────┐        │ │
│  │  │ Config Servers   │    │ Mongos Routers   │        │ │
│  │  │ (Metadata)       │◄───┤ (Query Router)   │        │ │
│  │  └──────────────────┘    └──────────────────┘        │ │
│  │                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │ │
│  │  │ Shard 1      │  │ Shard 2      │  │ Shard N   │  │ │
│  │  │ (Replica Set)│  │ (Replica Set)│  │ (RS)      │  │ │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Monitoring & Management Layer                │ │
│  │  • Automated Backups                                   │ │
│  │  • Point-in-Time Recovery (PITR)                       │ │
│  │  • Performance Advisor                                 │ │
│  │  • Real-time Monitoring                                │ │
│  │  • Security & Access Control                           │ │
│  │  • Auto-scaling                                        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
              ▲                                    ▼
        Atlas Control Plane            AWS/Azure/GCP Infrastructure
      (UI, Automation, Alerts)         (Multi-region deployment)
```

**Replica Set Components**:

```
┌─────────────────────────────────────────────────────────┐
│           Replica Set (3-Node Architecture)             │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │  PRIMARY     │    │  SECONDARY   │                 │
│  │  ┌────────┐  │    │  ┌────────┐  │                 │
│  │  │Oplog   │  │    │  │Oplog   │  │                 │
│  │  │Replication◄───────Replication  │                 │
│  │  │Stream  │  │    │  │Stream  │  │                 │
│  │  └────────┘  │    │  └────────┘  │                 │
│  │              │    │              │                 │
│  │ Accepts:     │    │ Accepts:     │                 │
│  │ • Writes     │    │ • Reads Only │                 │
│  │ • Reads      │    │ • (Optional) │                 │
│  └──────────────┘    └──────────────┘                 │
│         │                    │                         │
│         │                    │ Heartbeat (every 2s)    │
│         │                    │                         │
│         └────────────────────┤                         │
│                              │                         │
│                    ┌──────────────────┐               │
│                    │   ARBITER or     │               │
│                    │   SECONDARY      │               │
│                    │   (Tie-breaker)  │               │
│                    └──────────────────┘               │
│                                                       │
│  • Majority Consensus (2 of 3)                       │
│  • Automatic Failover (~10-30 seconds)              │
│  • Leader Election on Primary Failure                │
│  • Oplog: 5GB circular buffer (tunable)             │
└─────────────────────────────────────────────────────┘
```

**Cluster Tier Options**:

| Tier | Nodes | HA | Backup | Scaling | Use Case |
|------|-------|-----|--------|---------|----------|
| **Free** | 1 (Shared) | ❌ | 7 days | ❌ | Learning, POC |
| **Shared M0/M2/M5** | 3-Node RS | ✅ | 7 days | Limited | Development |
| **Dedicated M10+** | 3-Node RS | ✅ | 35 days PITR | ✅ | Production |
| **M50+** | 3+ Nodes | ✅ | 35 days PITR | ✅ Auto | Enterprise |

**Atlas Features**:

```
┌────────────────────────────────────────────────────────┐
│          Atlas Cluster Features                        │
├────────────────────────────────────────────────────────┤
│ ✅ Automatic Replication (3 nodes minimum)            │
│ ✅ Automatic Failover (< 30 seconds)                  │
│ ✅ Point-in-Time Recovery (PITR)                      │
│ ✅ Continuous Backup                                  │
│ ✅ Global Clusters (Multi-region reads)              │
│ ✅ Network Access (IP Whitelist, VPC)                │
│ ✅ Database Users & RBAC                              │
│ ✅ Performance Advisor                                │
│ ✅ Query Profiler                                     │
│ ✅ Schema Suggestions                                 │
│ ✅ Automated Index Creation                           │
│ ✅ Monitoring & Alerts                                │
│ ✅ API for automation                                 │
│ ✅ Cross-region load balancing                        │
│ ✅ Encryption (at-rest, in-transit)                  │
└────────────────────────────────────────────────────────┘
```

---

### Single Node vs. Atlas Comparison Table

| Feature | Single Node | Atlas Cluster |
|---------|------------|--------------|
| **Availability** | 1 node | 3+ nodes |
| **High Availability** | ❌ | ✅ Auto Failover |
| **Replication** | ❌ | ✅ Real-time |
| **Backup** | Manual | ✅ Automatic PITR |
| **Disaster Recovery** | ❌ | ✅ Multi-region |
| **Scalability** | Limited | ✅ Horizontal (Sharding) |
| **Read Scaling** | ❌ | ✅ Secondary nodes |
| **Monitoring** | Manual Tools | ✅ Built-in |
| **Security** | Basic | ✅ Advanced (VPC, Encryption) |
| **Maintenance** | Manual | ✅ Automated |
| **Updates** | Manual | ✅ Automated |
| **Cost** | Infrastructure | Monthly SaaS |
| **Setup Time** | Hours | Minutes |
| **Ideal For** | Dev/Test | Production |

---

## Query Profiling & Execution Statistics

### Response Object Structure

Each endpoint returns comprehensive execution statistics:

```json
{
  "indexType": "single-field",
  "indexName": "idx_products_sku_1",
  "query": { "sku": "P-1001" },
  "executionTimeMs": 0.234,
  "count": 1,
  "documents": [...],
  "executionStats": {
    "stage": "IXSCAN",
    "scanType": "IXSCAN",
    "nReturned": 1,
    "totalDocsExamined": 1,
    "totalKeysExamined": 1,
    "executionTimeMillis": 0,
    "efficiency": {
      "docsScannedPerDocReturned": "1.00",
      "keysScannedPerDocReturned": "1.00"
    }
  }
}
```

### Execution Metrics Explanation

- **stage**: Execution stage type (IXSCAN, COLLSCAN, FETCH, etc.)
- **scanType**: Index scan type (COLLSCAN = full collection scan, IXSCAN = index scan, FETCH = fetch from collection)
- **nReturned**: Number of documents returned to client
- **totalDocsExamined**: Documents scanned during execution
- **totalKeysExamined**: Index keys examined
- **docsScannedPerDocReturned**: Efficiency ratio (1.0 = optimal, >1 = wasted scans)
- **keysScannedPerDocReturned**: Key efficiency ratio

**Ideal Values**:
- `docsScannedPerDocReturned ≈ 1.0` (perfect index efficiency)
- `totalDocsExamined = nReturned` (no unnecessary document examination)

---

## Seed Script

The `seed.sh` script populates 4 collections with sample data:

### Collections & Sample Data

1. **products** (5 documents)
   - Fields: sku, name, category, price, tags, description, userId, promotionCode, metadata

2. **sessions** (3 documents)
   - Fields: userId, status, createdAt

3. **stores** (5 documents)
   - Fields: storeId, storeName, location (GeoJSON), address, status, createdAt

4. **orders** (6 documents)
   - Fields: orderId, userId, amount, status, createdAt

Run the seed script:

```bash
chmod +x seed.sh
./seed.sh
```

---

## Environment Variables

```bash
# .env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=indexing-analytics-poc
PORT=3020
NODE_ENV=development
```

---

## MongoDB Versions Supported

- **MongoDB 4.4+** (Community & Enterprise)
- **MongoDB 5.0+** (Recommended - Clustered indexes)
- **MongoDB 6.0+** (Latest features)
- **Atlas M0-M300+** (All versions)

---

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| NestJS | 10.3.0 | Framework |
| MongoDB | 6.3.0 | Native Driver |
| TypeScript | 5.1.6 | Language |
| Node.js | 18+ | Runtime |
| ts-node-dev | 2.0.0 | Development |

---

## Key Learning Outcomes

✅ Understand all 11 index types and their use cases  
✅ Learn index storage and lookup mechanisms  
✅ Compare query execution (IXSCAN vs COLLSCAN)  
✅ Measure query performance with execution statistics  
✅ Understand MongoDB single node vs. Atlas clusters  
✅ Learn replica set architecture and failover  
✅ Explore sharding and horizontal scaling  
✅ Master geospatial and partial indexing  

---

## References

- [MongoDB Index Documentation](https://docs.mongodb.com/manual/indexes/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [WiredTiger Engine](https://docs.mongodb.com/manual/core/wiredtiger/)
- [MongoDB Replica Sets](https://docs.mongodb.com/manual/replication/)
- [Query Performance Analysis](https://docs.mongodb.com/manual/tutorial/analyze-query-performance/)

