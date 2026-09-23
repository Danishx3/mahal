-- ==============================================================================
-- Migration: Add 'parammal' to division_enum
-- ==============================================================================
-- NOTE: In PostgreSQL, a newly added enum value cannot be used in the same
-- transaction where it is created. Please run STEP 1 first, and then STEP 2.

-- ------------------------------------------------------------------------------
-- STEP 1: Add 'parammal' to division_enum (Run this query first and click Run)
-- ------------------------------------------------------------------------------
ALTER TYPE division_enum ADD VALUE IF NOT EXISTS 'parammal';


-- ------------------------------------------------------------------------------
-- STEP 2: Update existing records (Run this query AFTER Step 1 finishes)
-- ------------------------------------------------------------------------------
-- UPDATE public.houses
-- SET division = 'parammal'
-- WHERE division::text = 'prammal';
