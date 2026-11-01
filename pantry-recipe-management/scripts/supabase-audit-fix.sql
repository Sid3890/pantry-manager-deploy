-- ====================================================================
-- PantryWise Supabase PostgreSQL Audit & Security Fix Script
-- ====================================================================

-- 1. Synchronize All Primary Key Sequences with MAX(id)
-- Prevents duplicate key errors when inserting new records
SELECT setval(pg_get_serial_sequence('categories', 'cat_id'), COALESCE((SELECT MAX(cat_id) FROM categories), 1));
SELECT setval(pg_get_serial_sequence('ingredients', 'ingredient_id'), COALESCE((SELECT MAX(ingredient_id) FROM ingredients), 1));
SELECT setval(pg_get_serial_sequence('recipes', 'recipe_id'), COALESCE((SELECT MAX(recipe_id) FROM recipes), 1));
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('pantry_items', 'item_id'), COALESCE((SELECT MAX(item_id) FROM pantry_items), 1));
SELECT setval(pg_get_serial_sequence('purchase_log', 'purchase_id'), COALESCE((SELECT MAX(purchase_id) FROM purchase_log), 1));
SELECT setval(pg_get_serial_sequence('recipe_ingredients', 'ri_id'), COALESCE((SELECT MAX(ri_id) FROM recipe_ingredients), 1));
SELECT setval(pg_get_serial_sequence('cooking_log', 'cook_id'), COALESCE((SELECT MAX(cook_id) FROM cooking_log), 1));
SELECT setval(pg_get_serial_sequence('dietary_tags', 'tag_id'), COALESCE((SELECT MAX(tag_id) FROM dietary_tags), 1));
SELECT setval(pg_get_serial_sequence('waste_log', 'waste_id'), COALESCE((SELECT MAX(waste_id) FROM waste_log), 1));

-- 2. Populate Accurate Dietary Tags for Seed Recipes (if not yet present)
INSERT INTO dietary_tags (recipe_id, label)
SELECT 201, 'Vegetarian' WHERE NOT EXISTS (SELECT 1 FROM dietary_tags WHERE recipe_id = 201 AND label = 'Vegetarian');
INSERT INTO dietary_tags (recipe_id, label)
SELECT 201, 'High Protein' WHERE NOT EXISTS (SELECT 1 FROM dietary_tags WHERE recipe_id = 201 AND label = 'High Protein');
INSERT INTO dietary_tags (recipe_id, label)
SELECT 202, 'Eggetarian' WHERE NOT EXISTS (SELECT 1 FROM dietary_tags WHERE recipe_id = 202 AND label = 'Eggetarian');
INSERT INTO dietary_tags (recipe_id, label)
SELECT 202, 'High Protein' WHERE NOT EXISTS (SELECT 1 FROM dietary_tags WHERE recipe_id = 202 AND label = 'High Protein');
INSERT INTO dietary_tags (recipe_id, label)
SELECT 203, 'Vegetarian' WHERE NOT EXISTS (SELECT 1 FROM dietary_tags WHERE recipe_id = 203 AND label = 'Vegetarian');

-- 3. Enable Row Level Security (RLS) on all 11 Application Tables
-- Secures database tables against unauthorized anonymous PostgREST access.
-- The Render backend connects via direct PostgreSQL as the database owner (postgres),
-- which automatically bypasses RLS while protecting public REST endpoints.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY;

-- 4. Verification Check
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

