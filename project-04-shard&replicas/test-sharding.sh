#!/bin/bash

echo "🚀 Configuring Sharding and Loading Data via Mongos..."

# Note: We connect to the 'mongos' router. Applications NEVER connect directly to a shard.
docker exec -it $(docker-compose ps -q mongos) mongosh --eval '

  // 1. Switch to the config database to lower the chunk size for testing
  // In production, chunks are 64MB. We lower it to 1MB so we can force the 
  // data to split across shards without needing to insert gigabytes of test data.
  db = db.getSiblingDB("config");
  db.settings.updateOne(
    { _id: "chunksize" },
    { $set: { _id: "chunksize", value: 1 } },
    { upsert: true }
  );
  print("✅ Chunk size lowered to 1MB for local testing.");

  // 2. Enable sharding on our specific database
  sh.enableSharding("fintech_db");
  print("✅ Sharding enabled on fintech_db.");

  // 3. Switch to our application database
  db = db.getSiblingDB("fintech_db");

  // 4. Create an index on the field we want to use as our Shard Key.
  // We use a "hashed" index on userId to ensure data is distributed perfectly 
  // evenly across all 3 shards, preventing a "hot shard" bottleneck.
  db.transactions.createIndex({ userId: "hashed" });
  print("✅ Hashed index created on userId.");

  // 5. Tell MongoDB to shard the collection using that key
  sh.shardCollection("fintech_db.transactions", { userId: "hashed" });
  print("✅ Collection fintech_db.transactions is now sharded!");

  // 6. Insert Bulk Data (100,000 records) to force data distribution
  print("⏳ Inserting 100,000 transactions... This will take a few moments...");
  
  let batch = [];
  for (let i = 1; i <= 100000; i++) {
    batch.push({
      transactionId: "TXN_" + i,
      // Randomly generating 1000 different user IDs
      userId: "USER_" + Math.floor(Math.random() * 1000), 
      amount: Math.random() * 500,
      status: "completed",
      createdAt: new Date()
    });

    // Insert in batches of 10,000 to prevent RAM overflow in the shell
    if (i % 10000 === 0) {
      db.transactions.insertMany(batch);
      batch = [];
      print(`   Inserted ${i} records...`);
    }
  }

  print("🎉 Data load complete!");
  print("--------------------------------------------------");
  print("📊 SHARD DISTRIBUTION REPORT:");
  print("--------------------------------------------------");
  
  // 7. Print the distribution so we can visually confirm it worked
  db.transactions.getShardDistribution();
'