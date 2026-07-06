#!/bin/bash

# Configuration
DB_URI="mongodb://localhost:27017/index_masterclass_ms_poc"

echo "Testing bash script"

mongosh $DB_URI --quiet --eval '
 

  if (db.getCollectionNames().includes("audit_logs")) {
    db.audit_logs.drop();
  }

  db.createCollection("audit_logs", {
   clusteredIndex: {
    key: {_id: 1},
    unique: true,
    name: "audit_logs_clustered_idx"
   }
  })

  const logs = [];
  for (let i = 1; i <= 300; i++) {
    logs.push({
      _id: 10000 + i, // Sequential IDs are highly optimized for clustered indexes
      action: i % 2 === 0 ? "LOGIN_SUCCESS" : "DATA_EXPORT",
      userId: `user_${Math.ceil(Math.random() * 10)}`,
      timestamp: new Date()
    });
  }
  db.audit_logs.insertMany(logs);
  print(`✅ Inserted ${logs.length} Audit Logs (Clustered Index Active)`);


'