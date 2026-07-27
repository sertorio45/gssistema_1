-- Anchored comments on image / carousel / video for approval review.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_comment_anchor_type') THEN
    CREATE TYPE public.social_comment_anchor_type AS ENUM (
      'none',
      'image',
      'carousel',
      'video'
    );
  END IF;
END
$$;

ALTER TABLE public.social_comments
  ADD COLUMN IF NOT EXISTS anchor_type public.social_comment_anchor_type NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS x_percent numeric(6, 3),
  ADD COLUMN IF NOT EXISTS y_percent numeric(6, 3),
  ADD COLUMN IF NOT EXISTS slide_index integer,
  ADD COLUMN IF NOT EXISTS media_time_ms integer,
  ADD COLUMN IF NOT EXISTS asset_id uuid;

ALTER TABLE public.social_comments
  DROP CONSTRAINT IF EXISTS social_comments_anchor_bounds_chk;

ALTER TABLE public.social_comments
  ADD CONSTRAINT social_comments_anchor_bounds_chk CHECK (
    (x_percent IS NULL OR (x_percent >= 0 AND x_percent <= 100))
    AND (y_percent IS NULL OR (y_percent >= 0 AND y_percent <= 100))
    AND (slide_index IS NULL OR slide_index >= 0)
    AND (media_time_ms IS NULL OR media_time_ms >= 0)
  );

ALTER TABLE public.social_comments
  DROP CONSTRAINT IF EXISTS social_comments_anchor_image_chk;

ALTER TABLE public.social_comments
  ADD CONSTRAINT social_comments_anchor_image_chk CHECK (
    anchor_type <> 'image'
    OR (x_percent IS NOT NULL AND y_percent IS NOT NULL)
  );

ALTER TABLE public.social_comments
  DROP CONSTRAINT IF EXISTS social_comments_anchor_carousel_chk;

ALTER TABLE public.social_comments
  ADD CONSTRAINT social_comments_anchor_carousel_chk CHECK (
    anchor_type <> 'carousel'
    OR (x_percent IS NOT NULL AND y_percent IS NOT NULL AND slide_index IS NOT NULL)
  );

ALTER TABLE public.social_comments
  DROP CONSTRAINT IF EXISTS social_comments_anchor_video_chk;

ALTER TABLE public.social_comments
  ADD CONSTRAINT social_comments_anchor_video_chk CHECK (
    anchor_type <> 'video'
    OR media_time_ms IS NOT NULL
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_comments_asset_tenant_fkey'
  ) THEN
    ALTER TABLE public.social_comments
      ADD CONSTRAINT social_comments_asset_tenant_fkey
      FOREIGN KEY (asset_id, tenant_id)
      REFERENCES public.media_assets(id, tenant_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS social_comments_version_idx
  ON public.social_comments (version_id, created_at DESC)
  WHERE version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_comments_asset_idx
  ON public.social_comments (asset_id)
  WHERE asset_id IS NOT NULL;

COMMENT ON COLUMN public.social_comments.x_percent IS
  'Horizontal pin position as percent of media width (0-100).';
COMMENT ON COLUMN public.social_comments.y_percent IS
  'Vertical pin position as percent of media height (0-100).';
COMMENT ON COLUMN public.social_comments.media_time_ms IS
  'Video timestamp in milliseconds for time-anchored comments.';
