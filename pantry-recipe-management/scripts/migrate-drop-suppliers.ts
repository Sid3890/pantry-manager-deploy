import "dotenv/config";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
const client = postgres(databaseUrl, { ssl: isLocal ? false : "require" });

async function migrate() {
  console.log("Applying migration: Drop suppliers module and update purchase_log...");

  await client.unsafe(`
    -- 1. Drop foreign key constraint from purchase_log to suppliers
    ALTER TABLE "purchase_log" DROP CONSTRAINT IF EXISTS "purchase_log_sup_id_suppliers_sup_id_fk";

    -- 2. Drop sup_id column from purchase_log
    ALTER TABLE "purchase_log" DROP COLUMN IF EXISTS "sup_id";

    -- 3. Add nullable supplier_name VARCHAR(160) to purchase_log
    ALTER TABLE "purchase_log" ADD COLUMN IF NOT EXISTS "supplier_name" varchar(160);

    -- 4. Drop suppliers table
    DROP TABLE IF EXISTS "suppliers" CASCADE;
  `);

  console.log("✓ Migration executed successfully!");
  console.log("- Removed foreign key constraint purchase_log_sup_id_suppliers_sup_id_fk");
  console.log("- Dropped column sup_id from purchase_log");
  console.log("- Added nullable column supplier_name to purchase_log");
  console.log("- Dropped table suppliers");

  await client.end();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});

