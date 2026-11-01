ALTER TABLE "purchase_log" DROP CONSTRAINT IF EXISTS "purchase_log_sup_id_suppliers_sup_id_fk";--> statement-breakpoint
ALTER TABLE "purchase_log" DROP COLUMN IF EXISTS "sup_id";--> statement-breakpoint
ALTER TABLE "purchase_log" ADD COLUMN IF NOT EXISTS "supplier_name" varchar(160);--> statement-breakpoint
DROP TABLE IF EXISTS "suppliers" CASCADE;
