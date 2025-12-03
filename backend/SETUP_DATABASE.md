# Setting Up Database Tables

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar (or go to: https://supabase.com/dashboard/project/[YOUR-PROJECT]/sql/new)
3. Click **New query**

## Step 2: Copy and Paste the SQL

1. Open the file: `backend/database-schema.sql`
2. Copy **ALL** the SQL code
3. Paste it into the Supabase SQL Editor

## Step 3: Run the SQL

1. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
2. You should see: "Success. No rows returned"

## Step 4: Verify Tables Were Created

Run this query in the SQL Editor to see all your tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see:
- comments
- follows
- likes
- posts
- users

## Step 5: Verify Table Structure

Check a specific table structure:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

---

## What Each Table Does:

- **users**: Stores user accounts (username, email, password, avatar)
- **posts**: Stores all posts (title, content, images, videos)
- **follows**: Tracks who follows whom (follower_id → following_id)
- **likes**: Tracks which users liked which posts
- **comments**: Stores comments on posts

---

## Troubleshooting

If you get an error:
- Make sure you're running the entire SQL file
- Check that there are no syntax errors
- Try running each CREATE TABLE statement one at a time

---

## Next Steps After Tables Are Created:

1. ✅ Tables created
2. ✅ Test backend connection
3. ✅ Build authentication API
4. ✅ Build posts API
5. ✅ Build follows API
6. ✅ Connect frontend

