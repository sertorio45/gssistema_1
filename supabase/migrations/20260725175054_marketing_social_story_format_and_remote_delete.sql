-- Add Stories as a first-class social post format (Meta Instagram/Facebook).
ALTER TYPE public.social_post_format ADD VALUE IF NOT EXISTS 'story';
