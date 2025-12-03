-- Ensure CASCADE deletes are set up correctly
-- Run this in Supabase SQL Editor to verify/update foreign key constraints

-- Check current foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (tc.table_name = 'likes' OR tc.table_name = 'comments')
ORDER BY tc.table_name, kcu.column_name;

-- Update likes table foreign key to ensure CASCADE
ALTER TABLE likes 
DROP CONSTRAINT IF EXISTS likes_post_id_fkey;

ALTER TABLE likes 
ADD CONSTRAINT likes_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Update comments table foreign key to ensure CASCADE
ALTER TABLE comments 
DROP CONSTRAINT IF EXISTS comments_post_id_fkey;

ALTER TABLE comments 
ADD CONSTRAINT comments_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Verify the changes
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (tc.table_name = 'likes' OR tc.table_name = 'comments')
    AND kcu.column_name = 'post_id'
ORDER BY tc.table_name;

-- Expected result: delete_rule should be 'CASCADE' for both likes and comments

