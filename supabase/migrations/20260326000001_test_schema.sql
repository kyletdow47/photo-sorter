-- =============================================================================
-- View1 Studio — Schema Validation Queries
-- Migration: 20260326000001_test_schema.sql
-- =============================================================================
-- These queries validate that all tables, enums, indexes, and triggers exist
-- as expected after running 20260326000000_create_schema.sql.
-- Run these manually or in a test pipeline to confirm the schema is correct.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Verify all tables exist
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  missing_tables text[] := '{}';
  expected_table text;
BEGIN
  FOREACH expected_table IN ARRAY ARRAY[
    'profiles',
    'workspaces',
    'workspace_members',
    'projects',
    'media',
    'categories',
    'gallery_access',
    'gallery_downloads',
    'invoices',
    'subscriptions',
    'email_logs',
    'notifications',
    'waitlist'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = expected_table
    ) THEN
      missing_tables := array_append(missing_tables, expected_table);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'OK — all 13 tables exist';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Verify RLS is enabled on all tables
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  rls_disabled text[] := '{}';
  t record;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'workspaces', 'workspace_members', 'projects',
        'media', 'categories', 'gallery_access', 'gallery_downloads',
        'invoices', 'subscriptions', 'email_logs', 'notifications', 'waitlist'
      )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class
      WHERE relname = t.tablename AND relrowsecurity = true
    ) THEN
      rls_disabled := array_append(rls_disabled, t.tablename);
    END IF;
  END LOOP;

  IF array_length(rls_disabled, 1) > 0 THEN
    RAISE EXCEPTION 'RLS not enabled on: %', array_to_string(rls_disabled, ', ');
  ELSE
    RAISE NOTICE 'OK — RLS enabled on all tables';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Verify required enums exist
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  missing_enums text[] := '{}';
  expected_enum text;
BEGIN
  FOREACH expected_enum IN ARRAY ARRAY[
    'user_role',
    'user_tier',
    'workspace_member_role',
    'project_status',
    'gallery_theme',
    'pricing_model',
    'media_orientation',
    'gallery_access_type',
    'download_type',
    'invoice_status',
    'subscription_status',
    'email_status'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_type
      WHERE typname = expected_enum AND typtype = 'e'
    ) THEN
      missing_enums := array_append(missing_enums, expected_enum);
    END IF;
  END LOOP;

  IF array_length(missing_enums, 1) > 0 THEN
    RAISE EXCEPTION 'Missing enums: %', array_to_string(missing_enums, ', ');
  ELSE
    RAISE NOTICE 'OK — all 12 enums exist';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Verify handle_new_user trigger exists on auth.users
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
      AND event_object_schema = 'auth'
      AND event_object_table = 'users'
  ) THEN
    RAISE EXCEPTION 'Missing trigger: on_auth_user_created on auth.users';
  ELSE
    RAISE NOTICE 'OK — on_auth_user_created trigger exists';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Verify key indexes exist
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  missing_indexes text[] := '{}';
  expected_index text;
BEGIN
  FOREACH expected_index IN ARRAY ARRAY[
    'idx_workspace_members_user_id',
    'idx_projects_workspace_id',
    'idx_media_project_id',
    'idx_gallery_access_token',
    'idx_notifications_user_id'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = expected_index
    ) THEN
      missing_indexes := array_append(missing_indexes, expected_index);
    END IF;
  END LOOP;

  IF array_length(missing_indexes, 1) > 0 THEN
    RAISE EXCEPTION 'Missing indexes: %', array_to_string(missing_indexes, ', ');
  ELSE
    RAISE NOTICE 'OK — all key indexes exist';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Verify column presence on key tables
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  missing_cols text[] := '{}';
  col_check record;
BEGIN
  FOR col_check IN VALUES
    ('profiles', 'stripe_customer_id'),
    ('profiles', 'stripe_account_id'),
    ('profiles', 'onboarded'),
    ('workspaces', 'slug'),
    ('projects', 'gallery_theme'),
    ('projects', 'pricing_model'),
    ('media', 'cloudflare_image_id'),
    ('media', 'ai_category'),
    ('media', 'ai_labels'),
    ('gallery_access', 'token'),
    ('gallery_access', 'expires_at'),
    ('invoices', 'stripe_checkout_session_id'),
    ('subscriptions', 'stripe_subscription_id')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = col_check.column1
        AND column_name = col_check.column2
    ) THEN
      missing_cols := array_append(missing_cols, col_check.column1 || '.' || col_check.column2);
    END IF;
  END LOOP;

  IF array_length(missing_cols, 1) > 0 THEN
    RAISE EXCEPTION 'Missing columns: %', array_to_string(missing_cols, ', ');
  ELSE
    RAISE NOTICE 'OK — all key columns exist';
  END IF;
END;
$$;
