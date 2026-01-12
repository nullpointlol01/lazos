-- Migration: Add pending_approval field to posts table
-- Date: 2025-01-XX
-- Description: Add moderation queue support with pending_approval flag

-- Add pending_approval column to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN DEFAULT FALSE;

-- Add moderation_reason column (optional, to store why it was flagged)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Add moderation_date column (when it was reviewed)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS moderation_date TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on pending posts
CREATE INDEX IF NOT EXISTS idx_posts_pending_approval
ON posts(pending_approval)
WHERE pending_approval = TRUE;

-- Create index for active posts queries (most common)
CREATE INDEX IF NOT EXISTS idx_posts_active_approved
ON posts(is_active, pending_approval)
WHERE is_active = TRUE AND pending_approval = FALSE;

-- Update existing posts to be approved (backward compatibility)
UPDATE posts
SET pending_approval = FALSE
WHERE pending_approval IS NULL;

-- Comments for documentation
COMMENT ON COLUMN posts.pending_approval IS 'Flag indicating if post is waiting for moderator approval';
COMMENT ON COLUMN posts.moderation_reason IS 'Reason why the post was flagged for moderation (e.g., "No animal detected", "NSFW content")';
COMMENT ON COLUMN posts.moderation_date IS 'Timestamp when the post was reviewed by a moderator';
