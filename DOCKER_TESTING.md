# Docker Guide

## Prerequisites

- Docker and Docker Compose installed
- `.env` file in the `backend/` with the required env

## Step 1: Build and Start

```bash
# Build and start
docker-compose up --build
```

## Step 2: Check Container Status

```bash
# Check if containers are running
docker-compose ps

# Check logs
docker-compose logs

# Check logs for frontend or backend
docker-compose logs backend
docker-compose logs frontend

```

## Step 3: Test Backend

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test database connection (if endpoint exists)
curl http://localhost:3000/test-db

# Expected response: {"success":true,"database":"connected","message":"Supabase connection successful!","data":[]}
```

## Step 4: Test Frontend No Backend

1. Open your browser and navigate to: `http://localhost`
2. The React app should load
3. Check browser console for any errors
4. Try logging in or accessing features that call the backend

## Step 5: Test Frontend With API

The frontend should be able to communicate with the backend at `http://localhost:3000`. Test it lol

- Logging in
- API operations

## Step 6: Check Health Status

````bash
# Check health status of containers
docker-compose ps

# You should see "healthy" status for both services

## Stop Containers

```bash
# Stop container
docker-compose stop

````

## Test Individually

You can also test individual services:

```bash
# Test backend only
docker-compose up backend

# Test frontend only (backend must be running separately)
docker-compose up frontend
```
