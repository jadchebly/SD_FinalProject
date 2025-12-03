# How to Get Supabase Credentials

## Step 1: Go to Supabase Project Settings

1. Open your Supabase dashboard
2. Go to your project
3. Click **Settings** (gear icon) in the left sidebar
4. Click **API** (or go directly to Settings → API)

## Step 2: Find Your Credentials

You'll see two important values:

### 1. Project URL
- Label: **Project URL** or **URL**
- Looks like: `https://xxxxx.supabase.co`
- Copy this entire URL

### 2. Anon/Public Key
- Label: **anon** `public` or **Project API keys** → **anon public**
- This is a long JWT token
- Starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Copy the entire key

## Step 3: Update Your .env File

Open `backend/.env` and add/update these lines:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- Use the **anon public** key (not the service_role key)
- The URL should start with `https://`
- No quotes needed around the values

## Step 4: Test the Connection

After updating `.env`, restart your server:

```bash
cd backend
npm run dev
```

Then test:
```bash
curl http://localhost:3000/test-db
```

---

## Visual Guide

In Supabase Dashboard:
```
Settings → API
├── Project URL: https://xxxxx.supabase.co  ← Copy this
└── Project API keys
    ├── anon public: eyJhbGc...  ← Copy this (the long token)
    └── service_role: (don't use this one)
```

---

## Security Note

The **anon public** key is safe to use in your backend. It's designed to be used with Row Level Security (RLS) policies. Never expose the **service_role** key publicly.

