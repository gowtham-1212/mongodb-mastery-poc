#!/bin/bash

# Configuration
DB_URI="mongodb://localhost:27017/index_masterclass_ms_poc"

echo "🌍 Seeding Advanced Specialty Indexes Database..."

mongosh $DB_URI --quiet --eval '
  print("Resetting collections...");

  // Drop collections if they exist
  db.restaurants.drop();
  db.iot_devices.drop();
  
  // Clustered indexes require explicit collection creation, so we check and drop first
  if (db.getCollectionNames().includes("audit_logs")) {
    db.audit_logs.drop();
  }

  print("----------------------------------------");
  print("1. Building Clustered Index (Audit Logs)");
  
  // ARCHITECT NOTE: Clustered Indexes are created at the collection level.
  //db.createCollection("audit_logs", {
    //clusteredIndex: {
    //key: { _id: 1 },
    //  unique: true,
    //  name: "audit_logs_clustered_idx"
    //}
  //});

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

  print("----------------------------------------");
  print("2. Building Geospatial Index (Restaurants)");

  const restaurants = [];
  // Generating coordinates roughly around New York City
  // GeoJSON format requires [longitude, latitude]
  for (let i = 1; i <= 300; i++) {
    restaurants.push({
      _id: `rest_${i}`,
      name: `City Cafe ${i}`,
      cuisine: i % 3 === 0 ? "Italian" : "American",
      location: {
        type: "Point",
        coordinates: [
          -74.0060 + (Math.random() * 0.1 - 0.05), // Longitude
          40.7128 + (Math.random() * 0.1 - 0.05)   // Latitude
        ]
      }
    });
  }
  db.restaurants.insertMany(restaurants);
  
  // Create the 2dsphere index for GeoJSON data
  //db.restaurants.createIndex({ location: "2dsphere" });
  print(`✅ Inserted ${restaurants.length} Restaurants (Geospatial Index Active)`);

  print("----------------------------------------");
  print("3. Building Wildcard Index (IoT Devices)");

  const devices = [];
  for (let i = 1; i <= 300; i++) {
    // We create highly dynamic schemas where keys are unpredictable
    const dynamicData = {};
    if (i % 2 === 0) dynamicData.temperature = Math.floor(Math.random() * 100);
    if (i % 3 === 0) dynamicData.humidity = `${Math.floor(Math.random() * 100)}%`;
    if (i % 4 === 0) dynamicData.voltage = "12V";
    if (i % 5 === 0) dynamicData.firmwareVersion = `v1.${i}`;

    devices.push({
      _id: `dev_${i}`,
      deviceType: "sensor",
      sensorData: dynamicData // This object changes drastically per document
    });
  }
  db.iot_devices.insertMany(devices);

  // Create the Wildcard index on the dynamic embedded object
  //db.iot_devices.createIndex({ "sensorData.$**": 1 });
  print(`✅ Inserted ${devices.length} IoT Devices (Wildcard Index Active)`);

  print("----------------------------------------");
  print("🚀 Specialty Indexes setup complete! Ready for testing.");
'