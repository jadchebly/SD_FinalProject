-- Check constraints on the posts table
-- Run this in your Supabase SQL Editor to see what constraints exist

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'posts'::regclass
ORDER BY contype, conname;

-- If you see a CHECK constraint that requires image_url or video_url to be NOT NULL,
-- you may need to modify it to allow nulls for "blurb" type posts.

-- Example of a constraint that would allow blurb posts without media:
-- ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_media_check;
-- ALTER TABLE posts ADD CONSTRAINT posts_media_check 
--   CHECK (
--     (type = 'blurb') OR 
--     (type = 'photo' AND image_url IS NOT NULL) OR 
--     (type = 'video' AND video_url IS NOT NULL)
--   );

