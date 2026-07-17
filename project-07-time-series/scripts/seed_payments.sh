#!/bin/bash
MONGODB_URI=${1:-"mongodb://localhost:27017/Mongodb_pocs"}

echo "💳 Seeding Fintech Time Series Data..."

mongosh "$MONGODB_URI" --quiet --eval '
  const collName = "transactions";
  const bulkData = [];
  const now = new Date();
  
  const merchants = ["MERCH_STRIPE_1", "MERCH_PAYPAL_2", "MERCH_SQUARE_3"];
  const statuses = ["SUCCESS", "SUCCESS", "SUCCESS", "FAILED", "PENDING"]; // Weighted towards success
  const methods = ["CREDIT_CARD", "DEBIT_CARD", "APPLE_PAY", "BANK_TRANSFER"];

  print(`Generating 5,000 historical transactions...`);

  for (let i = 0; i < 5000; i++) {
    // Spread transactions randomly over the last 7 days (604800000 ms)
    const randomTimeOffset = Math.floor(Math.random() * 604800000);
    const txnDate = new Date(now.getTime() - randomTimeOffset);
    
    bulkData.push({
      timestamp: txnDate,
      metadata: {
        merchantId: merchants[Math.floor(Math.random() * merchants.length)],
        currency: "USD",
        status: statuses[Math.floor(Math.random() * statuses.length)]
        transactionRef: `TXN-SEED-${i}-${Math.floor(Math.random() * 9999)}`
      },
      amount: parseFloat((Math.random() * 500 + 10).toFixed(2)), // $10.00 to $510.00
      paymentMethod: methods[Math.floor(Math.random() * methods.length)],
    });
  }

  // Insert in batches of 1000 to simulate high-throughput bursts
  print(`Inserting into Time Series bucket...`);
  db.getCollection(collName).insertMany(bulkData, { ordered: false });
  
  print(`✅ Successfully seeded 5,000 transactions!`);
'