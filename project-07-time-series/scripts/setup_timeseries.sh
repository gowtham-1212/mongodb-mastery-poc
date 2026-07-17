#!/bin/bash

# Define the connection string (defaults to local MongoDB if not provided as an argument)
MONGODB_URI=${1:-"mongodb://localhost:27017/Mongodb_pocs"}

echo "🌱 Starting MongoDB Time Series POC..."
echo "🔗 Connecting to: $MONGODB_URI"

# Execute JavaScript directly inside MongoDB via mongosh
mongosh "$MONGODB_URI" --quiet --eval '

  const dbName = db.getName();
  const collName = "greenhouse_metrics";

  print(`\n📦 Connected to database: ${dbName}`);

  // STEP 1: Drop existing collection for a clean slate
  if (db.getCollectionNames().includes(collName)) {
    db.getCollection(collName).drop();
    print(`🗑️  Dropped existing collection: ${collName}`);
  }

  // STEP 2: Create the Time Series Collection
  print(`\n🏗️  Creating Time Series Collection: ${collName}...`);
  db.createCollection(collName, {
    timeseries: {
      timeField: "timestamp",
      metaField: "sensor_id",
      granularity: "minutes" // We expect readings every few minutes
    }
  });
  print(`✅ Collection created successfully.`);

  // STEP 3: Generate Sample Data (3 Sensors, past 24 hours)
  print(`\n📊 Generating sample IoT data...`);
  const bulkData = [];
  const now = new Date();
  const sensors = ["sensor_alpha_1", "sensor_beta_2", "sensor_gamma_3"];

  // Generate a reading every 15 minutes for the last 24 hours
  for (let i = 0; i < 96; i++) {
    const readingTime = new Date(now.getTime() - (i * 15 * 60000));
    
    sensors.forEach(sensor => {
      bulkData.push({
        timestamp: readingTime,
        sensor_id: sensor,
        metrics: {
          temperature_celsius: parseFloat((22 + (Math.random() * 5)).toFixed(2)),
          humidity_percent: parseFloat((50 + (Math.random() * 20)).toFixed(2))
        }
      });
    });
  }

  db.getCollection(collName).insertMany(bulkData);
  print(`✅ Inserted ${bulkData.length} records into time series collection.`);

  // STEP 4: Test Query - Calculate average temperature per sensor
  print(`\n🔍 Running Analytical Query (Average Temp per Sensor):`);
  
  const results = db.getCollection(collName).aggregate([
    {
      $group: {
        _id: "$sensor_id",
        avg_temp: { $avg: "$metrics.temperature_celsius" },
        max_humidity: { $max: "$metrics.humidity_percent" },
        reading_count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray();

  results.forEach(res => {
    print(`   ➤ Sensor: ${res._id} | Avg Temp: ${res.avg_temp.toFixed(2)}°C | Max Humidity: ${res.max_humidity}% | Total Readings: ${res.reading_count}`);
  });

  print(`\n🎉 POC Execution Complete!\n`);
'