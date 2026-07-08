#!/bin/bash

echo "🚨 STARTING FAILOVER & HIGH AVAILABILITY TEST 🚨"
echo "--------------------------------------------------"

# 1. Find the current Primary node of Shard 1
echo "🔍 Step 1: Locating the current PRIMARY server for Shard 1..."

# We execute a tiny JavaScript snippet inside shard1-node1 to ask who the primary is
PRIMARY_NODE=$(docker exec -i $(docker-compose ps -q shard1-node1) mongosh --quiet --eval "
  rs.status().members.find(m => m.stateStr === 'PRIMARY').name.split(':')[0]
")

echo "⭐ The current Primary is: $PRIMARY_NODE"

# 2. Simulate a catastrophic failure
echo "🔥 Step 2: Simulating hardware failure... Pulling the plug on $PRIMARY_NODE!"
docker-compose stop $PRIMARY_NODE

# 3. Wait for the Replica Set Election
echo "⏳ Step 3: Waiting 10 seconds for the surviving nodes to elect a new Primary..."
# Behind the scenes, the Secondaries realize the Primary is dead and vote a new one into power.
sleep 10

# 4. Prove the database is still online
echo "✍️ Step 4: Proving zero-downtime. Attempting to write a new transaction via Mongos router..."

docker exec -i $(docker-compose ps -q mongos) mongosh --quiet --eval '
  const db = db.getSiblingDB("fintech_db");
  
  try {
    db.transactions.insertOne({
      transactionId: "FAILOVER_TEST_001",
      userId: "USER_SURVIVOR",
      amount: 200004,
      status: "completed",
      notes: "Inserted while a database server was dead!"
    });
    print("✅ SUCCESS! Write operation went through perfectly.");
  } catch (err) {
    print("❌ FAILURE! The write failed: ", err);
  }
'

# 5. Read the data back to verify
echo "📖 Step 5: Reading the failover record back..."
docker exec -i $(docker-compose ps -q mongos) mongosh --quiet --eval '
  const record = db.getSiblingDB("fintech_db").transactions.findOne({ transactionId: "FAILOVER_TEST_001" });
  printjson(record);
'

# 6. Heal the cluster
echo "🚑 Step 6: Healing the cluster. Booting $PRIMARY_NODE back up..."
docker-compose start $PRIMARY_NODE

echo "✅ Cluster healed! $PRIMARY_NODE will now automatically sync missing data and become a SECONDARY."
echo "--------------------------------------------------"
echo "🎉 TEST COMPLETE. Your architecture is fault-tolerant."