#!/bin/bash

echo "⏳ Waiting for containers to start..."
sleep 10

echo "🔧 1. Initializing Config Server Replica Set"
docker exec -it $(docker-compose ps -q cfg1) mongosh --eval '
  rs.initiate({
    _id: "cfgReplSet",
    configsvr: true,
    members: [
      { _id: 0, host: "cfg1:27017" },
      { _id: 1, host: "cfg2:27017" },
      { _id: 2, host: "cfg3:27017" }
    ]
  })
'

echo "🔧 2. Initializing Shard 1 Replica Set"
docker exec -it $(docker-compose ps -q shard1-node1) mongosh --eval '
  rs.initiate({
    _id: "shard1ReplSet",
    members: [
      { _id: 0, host: "shard1-node1:27017" },
      { _id: 1, host: "shard1-node2:27017" },
      { _id: 2, host: "shard1-node3:27017" }
    ]
  })
'

echo "🔧 3. Initializing Shard 2 Replica Set"
docker exec -it $(docker-compose ps -q shard2-node1) mongosh --eval '
  rs.initiate({
    _id: "shard2ReplSet",
    members: [
      { _id: 0, host: "shard2-node1:27017" },
      { _id: 1, host: "shard2-node2:27017" },
      { _id: 2, host: "shard2-node3:27017" }
    ]
  })
'

echo "🔧 4. Initializing Shard 3 Replica Set"
docker exec -it $(docker-compose ps -q shard3-node1) mongosh --eval '
  rs.initiate({
    _id: "shard3ReplSet",
    members: [
      { _id: 0, host: "shard3-node1:27017" },
      { _id: 1, host: "shard3-node2:27017" },
      { _id: 2, host: "shard3-node3:27017" }
    ]
  })
'

echo "⏳ Waiting for Replica Sets to elect primaries..."
sleep 15

echo "🔗 5. Adding Shards to the Router (mongos)"
docker exec -it $(docker-compose ps -q mongos) mongosh --eval '
  sh.addShard("shard1ReplSet/shard1-node1:27017,shard1-node2:27017,shard1-node3:27017");
  sh.addShard("shard2ReplSet/shard2-node1:27017,shard2-node2:27017,shard2-node3:27017");
  sh.addShard("shard3ReplSet/shard3-node1:27017,shard3-node2:27017,shard3-node3:27017");
'

echo "✅ Cluster is ready!"