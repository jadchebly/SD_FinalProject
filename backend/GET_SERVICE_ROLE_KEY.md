# Get Supabase Service Role Key

## Why Service Role Key?

The service_role key bypasses Row Level Security (RLS) policies, which is needed for backend uploads to Supabase Storage.

## Step 1: Get Service Role Key

1. Go to your Supabase Dashboard
2. Click **Settings** (gear icon) → **API**
3. Scroll to **Project API keys**
4. Find **service_role** key (NOT the anon key)
5. **⚠️ WARNING**: This key has admin access - never expose it in frontend code!

## Step 2: Add to .env

Add this line to your `backend/.env` file:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- Use the **service_role** key (not anon key)
- Keep this secret - never commit it to git
- This key bypasses all security policies

## Step 3: Restart Backend

After adding the key, restart your backend server:

```bash
cd backend
npm run dev
```

## Alternative: Disable RLS on Storage Bucket

If you prefer not to use service_role key:

1. Go to Supabase Dashboard → **Storage**
2. Click on your `posts` bucket
3. Go to **Policies** tab
4. You can disable RLS or add a policy that allows public uploads

But using service_role key is more secure for backend operations.

