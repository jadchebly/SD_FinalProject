# Backend API

Backend API for SD Final Project using Express, TypeScript, and Supabase.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

**For Local Development:**

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values.

**For Production/CI/CD:**

Use GitHub Secrets or your deployment platform's environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `FRONTEND_URL`

See `GITHUB_SECRETS_SETUP.md` for details.

### 3. Run Development Server

```bash
npm run dev
```

Server will run on http://localhost:3000

### 4. Build for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | Yes |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts      # Supabase client
│   ├── routes/              # API routes
│   ├── middleware/          # Express middleware
│   ├── controllers/         # Route controllers
│   └── app.ts               # Express app
├── .env                     # Local environment (gitignored)
├── .env.example             # Environment template
└── package.json
```

## API Endpoints

### Health Check
- `GET /health` - Server health check
- `GET /test-db` - Database connection test

## Database

Uses Supabase (PostgreSQL) with the following tables:
- `users` - User accounts
- `posts` - User posts
- `follows` - Follow relationships
- `likes` - Post likes
- `comments` - Post comments

## Security

- ✅ `.env` file is gitignored
- ✅ Use GitHub Secrets for CI/CD
- ✅ JWT authentication for protected routes
- ✅ CORS configured for frontend

## Documentation

- `GITHUB_SECRETS_SETUP.md` - How to set up GitHub Secrets
- `database-schema.sql` - Database schema
- `SETUP_DATABASE.md` - Database setup guide

