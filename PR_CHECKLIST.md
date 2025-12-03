# Pull Request Checklist

## Before Creating PR

### ✅ Security
- [x] `.env` file is in `.gitignore` (not committed)
- [x] `.env.example` created as template (no real secrets)
- [ ] GitHub Secrets configured (see `backend/GITHUB_SECRETS_SETUP.md`)

### ✅ Files to Commit
- [x] Backend code (`backend/src/`)
- [x] `backend/package.json` and `package-lock.json`
- [x] `backend/tsconfig.json`
- [x] `backend/.env.example` (template, no secrets)
- [x] `backend/README.md`
- [x] Documentation files
- [x] `.gitignore` (includes `.env`)

### ❌ Files NOT to Commit
- [ ] `backend/.env` (contains real secrets)
- [ ] `node_modules/`
- [ ] `dist/`

## GitHub Secrets to Add

Before merging, add these secrets to your GitHub repository:

1. Go to: **Repository → Settings → Secrets and variables → Actions**
2. Add these secrets:

| Secret Name | Value |
|------------|-------|
| `SUPABASE_URL` | `https://ttvxlvdlozrzmaatuydu.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full key) |
| `JWT_SECRET` | `cc6c7e2801c37fd244e938f85540439c060a3968e721f296d121258ad01c5424` |
| `FRONTEND_URL` | `http://localhost:5173` (or production URL) |

## PR Description Template

```markdown
## Backend Setup with Supabase

### Changes
- ✅ Set up Express + TypeScript backend
- ✅ Integrated Supabase client (replacing direct PostgreSQL)
- ✅ Created database schema (users, posts, follows, likes, comments)
- ✅ Configured environment variables with GitHub Secrets support
- ✅ Added CI/CD workflow

### Setup Required
1. Add GitHub Secrets (see `backend/GITHUB_SECRETS_SETUP.md`)
2. For local dev: Copy `backend/.env.example` to `backend/.env` and fill in values

### Testing
- [ ] Backend server starts successfully
- [ ] Database connection works
- [ ] All tables exist

### Documentation
- `backend/README.md` - Setup instructions
- `backend/GITHUB_SECRETS_SETUP.md` - GitHub Secrets guide
- `backend/database-schema.sql` - Database schema
```

## After PR is Merged

1. Team members should:
   - Pull latest changes
   - Copy `backend/.env.example` to `backend/.env`
   - Fill in their own Supabase credentials
   - Run `npm install` in `backend/`
   - Run `npm run dev` to start server

2. For deployment:
   - Add secrets to deployment platform (Railway, Vercel, etc.)
   - Secrets will be automatically available as environment variables

