DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_asset_purpose') THEN
    CREATE TYPE public.media_asset_purpose AS ENUM ('reference', 'publication');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_post_format') THEN
    CREATE TYPE public.social_post_format AS ENUM ('static', 'carousel', 'video');
  END IF;
END
$$;

ALTER TABLE public.media_assets
  ADD COLUMN purpose public.media_asset_purpose NOT NULL DEFAULT 'reference';

ALTER TABLE public.social_post_variants
  ADD COLUMN format public.social_post_format NOT NULL DEFAULT 'static';

CREATE INDEX media_assets_tenant_purpose_idx
  ON public.media_assets (tenant_id, purpose, created_at DESC);

CREATE INDEX social_post_variants_format_idx
  ON public.social_post_variants (tenant_id, format);
