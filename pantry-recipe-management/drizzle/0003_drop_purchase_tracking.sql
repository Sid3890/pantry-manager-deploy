-- ====================================================================
-- PantryWise Migration 0003: Drop Suppliers and Purchase Tracking
-- ====================================================================
-- 1. Drop foreign key constraint from pantry_items referencing purchase_log
ALTER TABLE "pantry_items" DROP CONSTRAINT IF EXISTS "pantry_items_purchase_id_purchase_log_purchase_id_fk";--> statement-breakpoint

-- 2. Drop purchase_id column from pantry_items (preserves all items, quantities, and expiry dates)
ALTER TABLE "pantry_items" DROP COLUMN IF EXISTS "purchase_id";--> statement-breakpoint

-- 3. Drop foreign key constraint from purchase_log referencing suppliers
ALTER TABLE "purchase_log" DROP CONSTRAINT IF EXISTS "purchase_log_sup_id_suppliers_sup_id_fk";--> statement-breakpoint

-- 4. Drop purchase_log table and its indexes, check constraints, and triggers
DROP TABLE IF EXISTS "purchase_log" CASCADE;--> statement-breakpoint

-- 5. Drop suppliers table
DROP TABLE IF EXISTS "suppliers" CASCADE;

