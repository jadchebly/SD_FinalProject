# Connection Troubleshooting

## Issue: DNS Lookup Failed (ENOTFOUND)

The connection string you provided might need verification. Here's how to fix it:

## Step 1: Verify Connection String in Supabase

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) → **Database**
3. Scroll to **Connection string**
4. Make sure you're copying the **URI** format (not Transaction or Session)
5. It should look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

## Step 2: Check Project Status

- Make sure your Supabase project has finished provisioning (green checkmark)
- If it's still setting up, wait 2-3 more minutes

## Step 3: Try Connection Pooling (Alternative)

If direct connection doesn't work, try the **Connection Pooling** string:

1. In Supabase: Settings → Database
2. Look for **Connection pooling** section
3. Copy the **URI** from there
4. It will use port **6543** instead of **5432**

## Step 4: Update .env File

Once you have the correct connection string, update `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
```

## Step 5: Test Again

Run:
```bash
cd backend
node test-connection.js
```

---

## Common Issues:

1. **Project still provisioning**: Wait a few minutes
2. **Wrong connection string**: Make sure it's the URI format
3. **Password with special characters**: May need URL encoding
4. **Network/firewall**: Check if port 5432 is accessible

---

## Next Steps After Connection Works:

1. ✅ Test connection works
2. ✅ Create database tables (run SQL schema)
3. ✅ Build authentication endpoints
4. ✅ Connect frontend to backend

