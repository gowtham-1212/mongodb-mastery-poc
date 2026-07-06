#!/usr/bin/env bash
set -euo pipefail

MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
DB_NAME="${DB_NAME:-indexing-analytics-poc}"

echo "Seeding MongoDB at ${MONGODB_URI}/${DB_NAME}"

mongosh "${MONGODB_URI}/${DB_NAME}" <<MONGO
const db = db.getSiblingDB('${DB_NAME}');

# db.products.deleteMany({});
# db.sessions.deleteMany({});
db.stores.deleteMany({});
db.orders.deleteMany({});

# const products = [
#   {
#     sku: 'P-1001',
#     name: 'Portable SSD',
#     category: 'electronics',
#     price: 129.99,
#     tags: ['storage', 'portable', 'analytics'],
#     description: 'Fast portable SSD for on-the-go analytics workloads.',
#     userId: 'alice@example.com',
#     promotionCode: 'SUMMER24',
#     metadata: { channel: 'web', manufacturer: 'FlashPro' },
#     createdAt: new Date('2024-06-01T10:00:00Z')
#   },
#   {
#     sku: 'P-1002',
#     name: 'Wireless Keyboard',
#     category: 'electronics',
#     price: 79.95,
#     tags: ['accessory', 'wireless'],
#     description: 'Bluetooth keyboard optimized for productivity.',
#     userId: 'bob@example.com',
#     metadata: { channel: 'mobile', manufacturer: 'KeyMaster' },
#     createdAt: new Date('2024-06-02T11:00:00Z')
#   },
#   {
#     sku: 'P-1003',
#     name: 'Notebook Bundle',
#     category: 'stationery',
#     price: 24.5,
#     tags: ['school', 'office', 'analytics'],
#     description: 'A premium notebook bundle for study and planning.',
#     userId: 'carol@example.com',
#     promotionCode: 'BACK2SCHOOL',
#     metadata: { channel: 'store', manufacturer: 'PaperWorks' },
#     createdAt: new Date('2024-06-03T12:00:00Z')
#   },
#   {
#     sku: 'P-1004',
#     name: 'Ergonomic Chair',
#     category: 'furniture',
#     price: 199.0,
#     tags: ['office', 'comfort'],
#     description: 'Ergonomic desk chair for long sessions.',
#     userId: 'alice@example.com',
#     metadata: { channel: 'web', manufacturer: 'ComfortSeat' },
#     createdAt: new Date('2024-06-04T13:00:00Z')
#   },
#   {
#     sku: 'P-1005',
#     name: 'Noise Cancelling Headphones',
#     category: 'electronics',
#     price: 179.99,
#     tags: ['audio', 'portable'],
#     description: 'Headphones with active noise cancellation for focus.',
#     userId: 'david@example.com',
#     metadata: { channel: 'web', manufacturer: 'SoundWave' },
#     createdAt: new Date('2024-06-05T14:00:00Z')
#   }
# ];

# const sessions = [
#   {
#     userId: 'alice@example.com',
#     status: 'active',
#     createdAt: new Date(Date.now() - 30 * 1000)
#   },
#   {
#     userId: 'bob@example.com',
#     status: 'active',
#     createdAt: new Date(Date.now() - 90 * 1000)
#   },
#   {
#     userId: 'carol@example.com',
#     status: 'expired',
#     createdAt: new Date(Date.now() - 120 * 1000)
#   }
# ];

const stores = [
  {
    storeId: 'store-001',
    storeName: 'Downtown Flagship',
    location: {
      type: 'Point',
      coordinates: [-73.9857, 40.7484]
    },
    address: '123 Main St, New York, NY',
    status: 'active',
    createdAt: new Date('2024-01-15T10:00:00Z')
  },
  {
    storeId: 'store-002',
    storeName: 'Midtown Mall',
    location: {
      type: 'Point',
      coordinates: [-73.9776, 40.7580]
    },
    address: '456 Park Ave, New York, NY',
    status: 'active',
    createdAt: new Date('2024-02-10T10:00:00Z')
  },
  {
    storeId: 'store-003',
    storeName: 'Brooklyn Hub',
    location: {
      type: 'Point',
      coordinates: [-73.9442, 40.6782]
    },
    address: '789 Atlantic Ave, Brooklyn, NY',
    status: 'active',
    createdAt: new Date('2024-03-05T10:00:00Z')
  },
  {
    storeId: 'store-004',
    storeName: 'Queens Center',
    location: {
      type: 'Point',
      coordinates: [-73.8249, 40.7282]
    },
    address: '321 Queens Blvd, Queens, NY',
    status: 'inactive',
    createdAt: new Date('2024-04-20T10:00:00Z')
  },
  {
    storeId: 'store-005',
    storeName: 'Upper West Side',
    location: {
      type: 'Point',
      coordinates: [-73.9776, 40.7829]
    },
    address: '654 Central Park West, New York, NY',
    status: 'active',
    createdAt: new Date('2024-05-12T10:00:00Z')
  }
];

const orders = [
  {
    orderId: 'ORD-001',
    userId: 'alice@example.com',
    amount: 250.50,
    status: 'completed',
    createdAt: new Date('2024-06-01T10:00:00Z')
  },
  {
    orderId: 'ORD-002',
    userId: 'bob@example.com',
    amount: 89.99,
    status: 'completed',
    createdAt: new Date('2024-06-02T12:00:00Z')
  },
  {
    orderId: 'ORD-003',
    userId: 'carol@example.com',
    amount: 1200.00,
    status: 'completed',
    createdAt: new Date('2024-06-03T15:00:00Z')
  },
  {
    orderId: 'ORD-004',
    userId: 'alice@example.com',
    amount: 45.25,
    status: 'pending',
    createdAt: new Date('2024-06-04T08:00:00Z')
  },
  {
    orderId: 'ORD-005',
    userId: 'david@example.com',
    amount: 599.99,
    status: 'completed',
    createdAt: new Date('2024-06-05T18:30:00Z')
  },
  {
    orderId: 'ORD-006',
    userId: 'eve@example.com',
    amount: 150.00,
    createdAt: new Date('2024-06-06T09:00:00Z')
  }
];

# db.products.insertMany(products);
# db.sessions.insertMany(sessions);
db.stores.insertMany(stores);
db.orders.insertMany(orders);

print(\`Seed complete. products=\${db.products.countDocuments()}, sessions=\${db.sessions.countDocuments()}, stores=\${db.stores.countDocuments()}, orders=\${db.orders.countDocuments()}\`);
MONGO