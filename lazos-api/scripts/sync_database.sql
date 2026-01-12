-- ============================================================================
-- LAZOS - Database Synchronization Script
-- ============================================================================
-- Purpose: Synchronize Supabase database with Python SQLAlchemy models
-- Target: Supabase PostgreSQL database
-- Created: 2025-12-31
--
-- IMPORTANT: This script is IDEMPOTENT (safe to run multiple times)
-- ============================================================================

-- ============================================================================
-- 1. POSTS TABLE - Add missing moderation fields
-- ============================================================================

-- Add pending_approval column
-- This column flags posts that need manual moderator approval before being visible
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN NOT NULL DEFAULT FALSE;

-- Add moderation_reason column
-- Stores the reason why a post was flagged, rejected, or approved with conditions
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS moderation_reason VARCHAR(500);

-- Add moderation_date column
-- Timestamp when the post was reviewed by a moderator
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS moderation_date TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 2. INDEXES - Optimize query performance
-- ============================================================================

-- Index for filtering pending posts (admin panel query)
CREATE INDEX IF NOT EXISTS ix_posts_pending_approval
ON posts(pending_approval);

-- Composite index for most common query: active AND approved posts
-- This is a partial index (only indexes rows where condition is true)
CREATE INDEX IF NOT EXISTS ix_posts_active_approved
ON posts(is_active, pending_approval)
WHERE is_active = TRUE AND pending_approval = FALSE;

-- ============================================================================
-- 3. DATA MIGRATION - Update existing posts
-- ============================================================================

-- Set pending_approval to FALSE for all existing posts (backward compatibility)
-- This ensures existing posts remain visible after migration
UPDATE posts
SET pending_approval = FALSE
WHERE pending_approval IS NULL;

-- ============================================================================
-- 4. COLUMN DOCUMENTATION - Add PostgreSQL comments
-- ============================================================================

COMMENT ON COLUMN posts.pending_approval IS
'Flag indicating if post is waiting for moderator approval. FALSE = approved/visible, TRUE = pending review';

COMMENT ON COLUMN posts.moderation_reason IS
'Optional reason for moderation action (e.g., "Flagged by AI", "Spam detected", "Manual review required")';

COMMENT ON COLUMN posts.moderation_date IS
'Timestamp when the post was reviewed by a moderator (approved or rejected)';

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after applying the migration to verify success:

-- Check if columns exist
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'posts'
-- AND column_name IN ('pending_approval', 'moderation_reason', 'moderation_date')
-- ORDER BY column_name;

-- Check if indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'posts'
-- AND indexname IN ('ix_posts_pending_approval', 'ix_posts_active_approved');

-- Count posts by status
-- SELECT
--     COUNT(*) as total_posts,
--     COUNT(*) FILTER (WHERE pending_approval = TRUE) as pending,
--     COUNT(*) FILTER (WHERE pending_approval = FALSE) as approved
-- FROM posts;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
