#!/usr/bin/env bash
set -euo pipefail

MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/financial-analytics}"
DB_NAME="${DB_NAME:-financial-analytics}"

echo "Seeding MongoDB at $MONGODB_URI"

mongosh "$MONGODB_URI" <<MONGO
const dbName = '${DB_NAME}';
const db = db.getSiblingDB(dbName);

db.users.deleteMany({});
db.transactions.deleteMany({});
db.transaction_archives.deleteMany({});

const users = [
  {
    _id: 'user-alice',
    email: 'alice@example.com',
    name: 'Alice Johnson',
    accountType: 'premium',
    createdAt: new Date('2024-01-10T10:00:00Z')
  },
  {
    _id: 'user-bob',
    email: 'bob@example.com',
    name: 'Bob Smith',
    accountType: 'basic',
    createdAt: new Date('2024-02-15T10:00:00Z')
  },
  {
    _id: 'user-carol',
    email: 'carol@example.com',
    name: 'Carol Davis',
    accountType: 'enterprise',
    createdAt: new Date('2024-03-20T10:00:00Z')
  }
];

const transactions = [
  {
    userId: 'alice@example.com',
    amount: 125.5,
    currency: 'USD',
    category: 'electronics',
    status: 'completed',
    createdAt: new Date('2024-06-01T09:00:00Z'),
    metadata: { merchant: 'Amazon', channel: 'web' }
  },
  {
    userId: 'bob@example.com',
    amount: 89.99,
    currency: 'EUR',
    category: 'books',
    status: 'completed',
    createdAt: new Date('2024-06-02T12:00:00Z'),
    metadata: { merchant: 'Bookshop', channel: 'mobile' }
  },
  {
    userId: 'carol@example.com',
    amount: 2500,
    currency: 'USD',
    category: 'travel',
    status: 'pending',
    createdAt: new Date('2024-06-03T15:00:00Z'),
    metadata: { merchant: 'Airline', channel: 'web' }
  },
  {
    userId: 'alice@example.com',
    amount: 40,
    currency: 'USD',
    category: 'groceries',
    status: 'failed',
    createdAt: new Date('2024-06-04T08:00:00Z'),
    metadata: { merchant: 'Walmart', channel: 'pos' }
  },
  {
    userId: 'bob@example.com',
    amount: 999.99,
    currency: 'USD',
    category: 'electronics',
    status: 'completed',
    createdAt: new Date('2024-06-05T18:30:00Z'),
    metadata: { merchant: 'BestBuy', channel: 'web' }
  }
];

const transactionArchives = [
  {
    category: 'electronics',
    totalAmount: 125.5,
    transactionCount: 1,
    archivedAt: new Date('2024-06-10T09:00:00Z')
  },
  {
    category: 'books',
    totalAmount: 89.99,
    transactionCount: 1,
    archivedAt: new Date('2024-06-11T10:00:00Z')
  },
  {
    category: 'travel',
    totalAmount: 2500,
    transactionCount: 1,
    archivedAt: new Date('2024-06-12T11:00:00Z')
  }
];

db.users.insertMany(users);
db.transactions.insertMany(transactions);
db.transaction_archives.insertMany(transactionArchives);

print(`Seed complete. Users: ${db.users.countDocuments()}, Transactions: ${db.transactions.countDocuments()}, Archives: ${db.transaction_archives.countDocuments()}`);
MONGO