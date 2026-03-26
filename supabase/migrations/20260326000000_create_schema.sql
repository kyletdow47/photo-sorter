-- =============================================================================
-- View1 Studio — Complete Supabase Schema with RLS Policies
-- Migration: 20260326000000_create_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('photographer', 'client');
CREATE TYPE user_tier AS ENUM ('free', 'pro', 'business');
CREATE TYPE workspace_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE project_status AS ENUM ('active', 'archived', 'published');
CREATE TYPE gallery_theme AS ENUM ('dark', 'light', 'minimal', 'editorial');
CREATE TYPE pricing_model AS ENUM ('free', 'flat_fee', 'per_photo');
CREATE TYPE media_orientation AS ENUM ('landscape', 'portrait', 'square');
CREATE TYPE gallery_access_type AS ENUM ('preview', 'full');
CREATE TYPE download_type AS ENUM ('single', 'zip', 'all');
CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'refunded');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
CREATE TYPE email_status AS ENUM ('sent', 'failed', 'bounced');

-- ---------------------------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  avatar_url      text,
  role            user_role NOT NULL DEFAULT 'photographer',
  tier            user_tier NOT NULL DEFAULT 'free',
  stripe_customer_id  text,
  stripe_account_id   text,
  onboarded           boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. WORKSPACES
-- ---------------------------------------------------------------------------

CREATE TABLE workspaces (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_select_members"
  ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspaces_update_owner"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_delete_owner"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "workspaces_insert_owner"
  ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. WORKSPACE_MEMBERS
-- ---------------------------------------------------------------------------

CREATE TABLE workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         workspace_member_role NOT NULL DEFAULT 'member',
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_own"
  ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_insert_owner"
  ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_delete_owner"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. PROJECTS
-- ---------------------------------------------------------------------------

CREATE TABLE projects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name             text NOT NULL,
  preset           text,
  status           project_status NOT NULL DEFAULT 'active',
  cover_image_url  text,
  gallery_public   boolean NOT NULL DEFAULT false,
  gallery_theme    gallery_theme NOT NULL DEFAULT 'dark',
  pricing_model    pricing_model NOT NULL DEFAULT 'free',
  flat_fee_cents   integer,
  per_photo_cents  integer,
  currency         text NOT NULL DEFAULT 'usd',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_workspace_members"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.id = workspace_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
    OR gallery_public = true
  );

CREATE POLICY "projects_insert_workspace_members"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.id = workspace_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

CREATE POLICY "projects_update_workspace_members"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.id = workspace_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.id = workspace_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

CREATE POLICY "projects_delete_workspace_members"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.id = workspace_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 5. MEDIA
-- ---------------------------------------------------------------------------

CREATE TABLE media (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path        text NOT NULL,
  filename            text NOT NULL,
  mime_type           text NOT NULL,
  size_bytes          bigint NOT NULL DEFAULT 0,
  width               integer,
  height              integer,
  orientation         media_orientation,
  cloudflare_image_id text,
  thumbnail_url       text,
  watermarked_url     text,
  ai_category         text,
  ai_confidence       float,
  ai_labels           jsonb,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_select_workspace_members"
  ON media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND p.gallery_public = true
    )
  );

CREATE POLICY "media_insert_workspace_members"
  ON media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

CREATE POLICY "media_update_workspace_members"
  ON media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

CREATE POLICY "media_delete_workspace_members"
  ON media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 6. CATEGORIES
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           text NOT NULL,
  color          text,
  sort_order     integer NOT NULL DEFAULT 0,
  auto_generated boolean NOT NULL DEFAULT true
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_workspace_members"
  ON categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

CREATE POLICY "categories_insert_workspace_members"
  ON categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

CREATE POLICY "categories_update_workspace_members"
  ON categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

CREATE POLICY "categories_delete_workspace_members"
  ON categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE p.id = project_id
        AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 7. GALLERY_ACCESS
-- ---------------------------------------------------------------------------

CREATE TABLE gallery_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  access_type gallery_access_type NOT NULL DEFAULT 'preview',
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  accessed_at timestamptz
);

ALTER TABLE gallery_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gallery_access_select_project_owner"
  ON gallery_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.owner_id = auth.uid()
    )
    OR token = current_setting('app.gallery_token', true)
  );

CREATE POLICY "gallery_access_insert_project_owner"
  ON gallery_access FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "gallery_access_update_project_owner"
  ON gallery_access FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "gallery_access_delete_project_owner"
  ON gallery_access FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 8. GALLERY_DOWNLOADS
-- ---------------------------------------------------------------------------

CREATE TABLE gallery_downloads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  media_id      uuid REFERENCES media(id) ON DELETE SET NULL,
  email         text NOT NULL,
  download_type download_type NOT NULL DEFAULT 'single',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gallery_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gallery_downloads_select_project_owner"
  ON gallery_downloads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "gallery_downloads_insert_any"
  ON gallery_downloads FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 9. INVOICES
-- ---------------------------------------------------------------------------

CREATE TABLE invoices (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_email                text NOT NULL,
  amount_cents                integer NOT NULL,
  currency                    text NOT NULL DEFAULT 'usd',
  status                      invoice_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id    text,
  stripe_checkout_session_id  text,
  paid_at                     timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_project_owner"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.owner_id = auth.uid()
    )
  );

-- Insert is via service role (Edge Functions / Stripe webhooks)
-- No client-side insert policy needed

-- ---------------------------------------------------------------------------
-- 10. SUBSCRIPTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL,
  plan_id               text NOT NULL,
  status                subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 11. EMAIL_LOGS
-- ---------------------------------------------------------------------------

CREATE TABLE email_logs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email  text NOT NULL,
  template  text NOT NULL,
  subject   text NOT NULL,
  status    email_status NOT NULL DEFAULT 'sent',
  metadata  jsonb,
  sent_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Email logs are managed by service role only; no user-facing RLS select policy

-- ---------------------------------------------------------------------------
-- 12. NOTIFICATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type      text NOT NULL,
  title     text NOT NULL,
  body      text NOT NULL,
  read      boolean NOT NULL DEFAULT false,
  metadata  jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 13. WAITLIST (use IF NOT EXISTS — may already exist)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_insert_anon" ON waitlist
  FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER FUNCTION
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- AUTO-PROVISIONING TRIGGER — handle_new_user()
-- Runs on auth.users INSERT:
--   1. Creates a profile row
--   2. Creates a default workspace
--   3. Adds the user as workspace owner
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name text;
  v_workspace_id uuid;
  v_slug         text;
BEGIN
  -- Derive display name from metadata or email
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Insert profile
  INSERT INTO public.profiles (id, display_name, role, tier, onboarded)
  VALUES (NEW.id, v_display_name, 'photographer', 'free', false);

  -- Generate a unique slug from display name
  v_slug := lower(regexp_replace(v_display_name, '[^a-z0-9]+', '-', 'g'))
    || '-' || substr(NEW.id::text, 1, 8);

  -- Create default workspace
  INSERT INTO public.workspaces (owner_id, name, slug)
  VALUES (NEW.id, v_display_name || '''s Workspace', v_slug)
  RETURNING id INTO v_workspace_id;

  -- Add user as workspace owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_media_project_id ON media(project_id);
CREATE INDEX idx_gallery_access_token ON gallery_access(token);
CREATE INDEX idx_gallery_downloads_project_id ON gallery_downloads(project_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
