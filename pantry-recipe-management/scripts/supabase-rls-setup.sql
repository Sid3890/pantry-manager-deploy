-- ====================================================================
-- PantryWise Supabase PostgreSQL Row-Level Security (RLS) Policy Setup
-- ====================================================================
-- Purpose:
-- 1. Enforces Row-Level Security across all 10 application tables.
-- 2. Restricts direct Supabase PostgREST (anon / authenticated) access.
-- 3. Grants read-only access on shared catalogue data (recipes, ingredients, categories).
-- 4. Enforces default-deny on all private user tables (users, pantry_items, purchase_log, cooking_log, waste_log).
-- Note: The Node.js / Express backend connects as table owner (postgres), which bypasses RLS
-- and performs its own application-level authentication and query isolation.
-- ====================================================================

-- --------------------------------------------------------------------
-- SECTION 1: Enable RLS on all 10 tables
-- --------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_tags ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- SECTION 2: Clean up any existing policies to prevent conflicts
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "categories_read_policy" ON categories;
DROP POLICY IF EXISTS "ingredients_read_policy" ON ingredients;
DROP POLICY IF EXISTS "recipes_read_policy" ON recipes;
DROP POLICY IF EXISTS "recipe_ingredients_read_policy" ON recipe_ingredients;
DROP POLICY IF EXISTS "dietary_tags_read_policy" ON dietary_tags;

DROP POLICY IF EXISTS "users_deny_anon_access" ON users;
DROP POLICY IF EXISTS "pantry_items_deny_anon_access" ON pantry_items;
DROP POLICY IF EXISTS "purchase_log_deny_anon_access" ON purchase_log;
DROP POLICY IF EXISTS "cooking_log_deny_anon_access" ON cooking_log;
DROP POLICY IF EXISTS "waste_log_deny_anon_access" ON waste_log;

-- --------------------------------------------------------------------
-- SECTION 3: Shared Catalogue Tables (Read-Only for anon & authenticated)
-- --------------------------------------------------------------------
-- Allows safe, public catalogue reads if PostgREST is queried.
-- Modification (INSERT, UPDATE, DELETE) is strictly DENIED to anon and authenticated roles.

CREATE POLICY "categories_read_policy"
  ON categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "ingredients_read_policy"
  ON ingredients
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "recipes_read_policy"
  ON recipes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "recipe_ingredients_read_policy"
  ON recipe_ingredients
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "dietary_tags_read_policy"
  ON dietary_tags
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- --------------------------------------------------------------------
-- SECTION 4: Private User Tables (Strict Default-Deny on PostgREST)
-- --------------------------------------------------------------------
-- In PostgreSQL, when RLS is ENABLED and NO policy grants access,
-- all operations (SELECT, INSERT, UPDATE, DELETE) for anon and authenticated
-- are DENIED BY DEFAULT.
--
-- The backend connects via postgres / service_role (table owner), which
-- has BYPASSRLS privilege and handles user isolation via WHERE user_id = $1.

-- --------------------------------------------------------------------
-- SECTION 5: Verification Queries
-- --------------------------------------------------------------------
-- Check RLS status across all application tables
SELECT 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all active policies
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

