#!/bin/bash

# Configuration
DB_URI="mongodb://localhost:27017/index_masterclass_ms_poc"

echo "🌱 Seeding MongoDB Index Masterclass Database..."

mongosh $DB_URI --quiet --eval '
  // 1. Reset collections for idempotency
  db.users.drop();
  db.orders.drop();
  db.products.drop();
  db.articles.drop();

  print("Collections dropped. Generating data...");

  // 2. Generate 300 Users (For Single, Partial, and Hashed Indexes)
  const users = [];
  for (let i = 1; i <= 300; i++) {
    users.push({
      _id: i,
      email: `user${i}@test.com`,
      name: `User ${i}`,
      tenantId: i <= 15 ? "tenant_A" : "tenant_B",
      active: i % 4 !== 0 // 75% of users will be active
    });
  }
  db.users.insertMany(users);
  print(`✅ Inserted ${users.length} Users`);

  // 3. Generate 300 Orders (For Compound Index)
  const orders = [];
  const statuses = ["paid", "pending", "failed"];
  for (let i = 1; i <= 300; i++) {
    orders.push({
      _id: `ord_${i}`,
      userId: Math.ceil(Math.random() * 300),
      status: statuses[i % 3],
      amount: Math.floor(Math.random() * 1000) + 50,
      createdAt: new Date()
    });
  }
  db.orders.insertMany(orders);
  print(`✅ Inserted ${orders.length} Orders`);

  // 4. Generate 300 Products (For Multikey and Wildcard Indexes)
  const products = [];
  const allTags = ["tech", "work", "gaming", "home", "kitchen"];
  for (let i = 1; i <= 300; i++) {
    products.push({
      _id: `prod_${i}`,
      name: `Product ${i}`,
      // Grab 2 random tags for the array
      tags: [allTags[i % 5], allTags[(i + 1) % 5]],
      // Dynamic specs for wildcard indexing
      customSpecs: {
        color: i % 2 === 0 ? "Black" : "White",
        weight: `${Math.floor(Math.random() * 5) + 1}kg`,
        [(i % 2 === 0 ? "RAM" : "Material")]: i % 2 === 0 ? "16GB" : "Cotton"
      }
    });
  }
  db.products.insertMany(products);
  print(`✅ Inserted ${products.length} Products`);

  // 5. Generate 300 Articles (For Text Index)
  const articles = [];
  for (let i = 1; i <= 300; i++) {
    articles.push({
      _id: `art_${i}`,
      title: `Guide to Concept ${i}`,
      // Adding specific keywords so you can test the $text search
      content: i % 3 === 0 
        ? `Learn async programming and backend architecture in chapter ${i}.` 
        : `This is standard filler content for article ${i} about databases.`
    });
  }
  db.articles.insertMany(articles);
  print(`✅ Inserted ${articles.length} Articles`);

  print("----------------------------------------");
  print("🏗️  Building Architect-Level Indexes...");

  // Build Single Index (Users)
  //db.users.createIndex({ email: 1 });
  
  // Build Partial Index (Users)
  //db.users.createIndex({ name: 1 }, { partialFilterExpression: { active: true } });
  
  // Build Hashed Index (Users)
  //db.users.createIndex({ tenantId: "hashed" });

  // Build Compound Index (Orders - following ESR rule)
  //db.orders.createIndex({ status: 1, amount: -1 });

  // Build Multikey Index (Products tags array)
  //db.products.createIndex({ tags: 1 });

  // Build Wildcard Index (Products custom dynamic specs)
  //db.products.createIndex({ "customSpecs.$**": 1 });

  // Build Text Index (Articles)
  //db.articles.createIndex({ content: "text" });

  print("🚀 All indexes created successfully! Your lab is ready.");
'