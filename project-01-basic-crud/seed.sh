#!/usr/bin/env bash
set -euo pipefail

MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/ecommerce-inventory}"

echo "Seeding MongoDB at $MONGODB_URI"

mongosh "$MONGODB_URI" <<'MONGO'
use ecommerce-inventory

const users = [
  {
    email: 'alice@example.com',
    name: 'Alice Austin',
    age: 28,
    isActive: true,
    tags: ['premium', 'newsletter'],
    preferences: { newsletter: true, notifications: true }
  },
  {
    email: 'bob@example.com',
    name: 'Bob Benson',
    age: 22,
    isActive: false,
    tags: ['trial'],
    preferences: { newsletter: false, notifications: false }
  },
  {
    email: 'carol@example.com',
    name: 'Carol Chen',
    age: 35,
    isActive: true,
    tags: ['vip', 'sales'],
    preferences: { newsletter: true, notifications: false }
  },
  {
    email: 'david@example.com',
    name: 'David Doe',
    age: 41,
    isActive: true,
    tags: []
    // preferences intentionally omitted to support $exists examples
  }
];

const products = [
  {
    sku: 'LAP-001',
    name: 'Gaming Laptop',
    price: 1499.99,
    quantity: 14,
    category: 'electronics',
    isActive: true,
    tags: ['featured', 'sale'],
    reviews: [
      { userId: 'alice@example.com', rating: 5, comment: 'Amazing performance' },
      { userId: 'bob@example.com', rating: 3, comment: 'Good, but heavy' }
    ],
    metadata: {
      weight: 2.5,
      dimensions: { length: 35, width: 25, height: 2.0 }
    }
  },
  {
    sku: 'BOK-002',
    name: 'Database Design Book',
    price: 39.99,
    quantity: 65,
    category: 'books',
    isActive: true,
    tags: ['education', 'bestseller'],
    reviews: [
      { userId: 'carol@example.com', rating: 4, comment: 'Very insightful' }
    ],
    metadata: {
      weight: 0.9,
      dimensions: { length: 21, width: 15, height: 3 }
    }
  },
  {
    sku: 'TOY-003',
    name: 'Remote Control Car',
    price: 24.95,
    quantity: 200,
    category: 'toys',
    isActive: false,
    tags: ['clearance', 'sale'],
    reviews: []
    // no metadata to support $exists false example
  },
  {
    sku: 'HDW-004',
    name: 'USB-C Hub',
    price: 19.99,
    quantity: 120,
    category: 'electronics',
    isActive: true,
    tags: ['accessory'],
    reviews: [
      { userId: 'david@example.com', rating: 4, comment: 'Useful and compact' }
    ],
    metadata: {
      weight: 0.1,
      dimensions: { length: 10, width: 4, height: 1.5 }
    }
  }
];

db.users.deleteMany({});
db.products.deleteMany({});
db.users.insertMany(users);
db.products.insertMany(products);

print(`Seed completed: users=${db.users.countDocuments()}, products=${db.products.countDocuments()}`);
MONGO