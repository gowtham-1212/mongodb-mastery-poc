# Project 02: Aggregation Framework with Fastify

## Overview

This project demonstrates Fastify plus the native MongoDB driver for aggregation pipelines in a financial transactions analytics dashboard.

It includes routes for:
- metrics aggregation
- relational joins
- computed data shaping
- faceted analytics
- weekly archive aggregation

## Run locally

```bash
cd project-02-aggregation
npm install
chmod +x seed.sh
./seed.sh
npm run dev
```
### Open:

http://localhost:3010/health
http://localhost:3010/api/metrics
http://localhost:3010/api/joins/transactions-with-users
http://localhost:3010/api/data-shaping/tax-adjusted-transactions
http://localhost:3010/api/facets/transaction-facets
http://localhost:3010/api/archive/weekly-transactions

### Seed script
A seed script is provided to insert sample users and transactions documents.

./seed.sh

The script populates:
- users
- transactions
- clears transaction_archives

### Routes and aggregation pipelines
GET /api/metrics
Use case:
- summarize completed transaction metrics by a grouping field

Pipeline:
- $match only completed transactions
- $group by category, currency, status, or userId
- $sort by totalAmount descending

Query param:
- groupBy (default: category)

Example:

curl 'http://localhost:3010/api/metrics?groupBy=currency'

### GET /api/joins/transactions-with-users
Use case:
- join transaction records with user profiles for enriched analytics

Pipeline:
- $lookup from users
- $unwind joined user document
- $project selected transaction and user fields

Endpoint:

curl 'http://localhost:3010/api/joins/transactions-with-users'

### GET /api/data-shaping/tax-adjusted-transactions
Use case:
- compute tax rate and total with tax for each transaction

Pipeline:
- $addFields taxRate using $switch
- $addFields taxAmount and totalWithTax using $multiply and $add
- $project final response fields

Endpoint:

curl 'http://localhost:3010/api/data-shaping/tax-adjusted-transactions'

### GET /api/facets/transaction-facets
Use case:
- return multiple analytics views in one query

Pipeline:
- $facet to compute:
  - totalsByCategory
  - statusBreakdown
  - recentTransactions

Endpoint:
curl 'http://localhost:3010/api/facets/transaction-facets'

### POST /api/archive/weekly-transactions
Use case:
- aggregate last 7 days of transactions and save summary to archive collection

Pipeline:
- $match by createdAt within 7 days
- $group totals by category
- $project archived summary fields

Endpoint:
curl -X POST 'http://localhost:3010/api/archive/weekly-transactions'

## Aggregation stages used
- $match
- $group
- $sort
- $lookup
- $unwind
- $project
- $addFields
- $switch
- $multiply
- $add
- $facet
- $limit

## Other aggregation stages you can explore
These were not used in this project, but are valuable for advanced pipelines:

- $bucket
- $bucketAuto
- $merge
- $out
- $graphLookup
- $redact
- $replaceRoot
- $replaceWith
- $sample
- $sortByCount
- $setWindowFields
- $unionWith
- $map
- $filter