# How to Disable RLS on Supabase Storage Bucket

## Option 1: Disable RLS Entirely (Easiest)

1. Go to your **Supabase Dashboard**
2. Click **Storage** in the left sidebar
3. Click on your **`posts`** bucket (or whatever bucket you're using)
4. Go to the **Policies** tab
5. Look for **"Enable RLS"** toggle at the top
6. **Turn OFF** the toggle (disable RLS)
7. Confirm if prompted

**Note**: This makes the bucket fully public - anyone can upload/read files. Fine for public image posts.

---

## Option 2: Add Permissive Policy (More Secure)

If you want to keep RLS enabled but allow uploads:

1. Go to **Storage** → **`posts`** bucket → **Policies** tab
2. Click **New Policy**
3. Choose **"For full customization"**
4. Add this policy for INSERT (uploads):

```sql
-- Allow anyone to upload images
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'posts');
```

5. Make sure you already have a SELECT policy for reading (from earlier setup)
6. Click **Review** → **Save policy**

---

## Option 3: Use Service Role Key (Most Secure for Backend)

Instead of disabling RLS, use the service_role key in your backend (see `GET_SERVICE_ROLE_KEY.md`).

This keeps RLS enabled but allows your backend to bypass it.

---

## Recommended: Option 1 (Disable RLS)

For a public image sharing app, **Option 1** is simplest:
- ✅ No policies to manage
- ✅ Works immediately
- ✅ Fine for public image posts
- ⚠️ Anyone can upload (but you validate file types/size in backend)

---

## After Disabling RLS

1. Restart your backend server (if it's running)
2. Try uploading an image again
3. It should work now!

