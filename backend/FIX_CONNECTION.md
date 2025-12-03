# Fix Database Connection Issue

## Problem
The hostname `db.ttvxlvdlozrzmaatuydu.supabase.co` cannot be found (DNS lookup fails).

## Solution: Verify Your Connection String

### Step 1: Check Supabase Project Status
1. Go to your Supabase dashboard
2. Make sure your project shows a **green checkmark** (fully provisioned)
3. If it's still setting up, wait 2-3 more minutes

### Step 2: Get the Correct Connection String

**Option A: Direct Connection (Port 5432)**
1. Go to: **Settings** → **Database**
2. Scroll to **Connection string**
3. Click the **URI** tab
4. Copy the connection string
5. It should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```
   OR
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

**Option B: Connection Pooling (Port 6543) - RECOMMENDED**
1. Go to: **Settings** → **Database**
2. Scroll to **Connection pooling**
3. Click the **URI** tab
4. Copy that connection string instead
5. It uses port **6543** and is more reliable

### Step 3: Update Your .env File

1. Open `backend/.env`
2. Replace the `DATABASE_URL` line with the new connection string
3. Make sure there are no extra spaces or quotes

Example:
```env
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Step 4: Test Again

```bash
cd backend
node test-connection.js
```

---

## Alternative: Use Supabase Client (Easier)

If direct PostgreSQL connection keeps failing, you can use Supabase's JavaScript client instead:

1. Install: `npm install @supabase/supabase-js`
2. Use Supabase client instead of direct PostgreSQL connection
3. This is often more reliable for Supabase projects

---

## Quick Check: Is Your Project Active?

1. Go to Supabase dashboard
2. Check if your project is **paused** (free tier projects pause after inactivity)
3. If paused, click **Restore** to reactivate it
4. Wait for it to fully restore before trying to connect

---

## Still Not Working?

1. **Double-check the connection string** - Copy it fresh from Supabase
2. **Try Connection Pooling** - Often more reliable
3. **Check project status** - Make sure it's active and provisioned
4. **Verify password** - Make sure special characters are URL-encoded if needed

