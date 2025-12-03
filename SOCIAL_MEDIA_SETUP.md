# Social Media App Setup Guide

## ✅ What's Been Implemented

### Backend API Endpoints
1. **Authentication**
   - `POST /api/signup` - Create new user account
   - `POST /api/login` - Login user

2. **User Management**
   - `GET /api/users/:id` - Get user profile with follow status
   - `GET /api/users/search/:query` - Search users by username

3. **Following System**
   - `POST /api/follow/:userId` - Follow a user
   - `DELETE /api/follow/:userId` - Unfollow a user

4. **Feed**
   - `GET /api/feed` - Get posts from followed users + own posts

5. **Posts**
   - `POST /api/posts` - Create post
   - `DELETE /api/posts/:id` - Delete post

6. **Likes**
   - `POST /api/posts/:id/like` - Like a post
   - `DELETE /api/posts/:id/like` - Unlike a post

7. **Comments**
   - `GET /api/posts/:id/comments` - Get comments for a post
   - `POST /api/posts/:id/comments` - Add comment to post

### Frontend Updates
1. **AuthContext** - Now uses backend API for signup/login
2. **Dashboard** - Fetches feed from API (posts from followed users + own posts)
3. **Likes/Comments** - Now use API instead of localStorage
4. **API Service** - All new endpoints added

## 📋 Setup Steps

### 1. Create Database Tables

Run the SQL in `backend/database-schema.sql` in your Supabase SQL Editor:

```sql
-- This will create:
-- - follows table (for following relationships)
-- - likes table (for post likes)
-- - comments table (for post comments)
-- - RLS policies for security
```

### 2. Update Environment Variables

Make sure your `backend/.env` has:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For storage deletions
PORT=3000
```

### 3. Restart Backend

```bash
cd backend
npm run dev
```

### 4. Test the Setup

1. **Sign up a new user:**
   ```bash
   curl -X POST http://localhost:3000/api/signup \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
   ```

2. **Login:**
   ```bash
   curl -X POST http://localhost:3000/api/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. **Create a post** (from frontend)

4. **Follow another user** (once UI is added)

## 🎯 What Still Needs to Be Done

### Frontend UI Components Needed:

1. **User Profile Page** (`/profile/:userId`)
   - Show user info, follower/following counts
   - Follow/Unfollow button
   - User's posts

2. **User Search/Discovery**
   - Search bar in Navbar
   - Results dropdown
   - Click to view profile

3. **Follow Button on Posts**
   - Show "Follow" button on posts from users you don't follow
   - Update feed when you follow someone

4. **Comments UI Enhancement**
   - Load comments when opening post modal
   - Real-time comment updates

## 🔄 How It Works Now

### User Flow:
1. **Sign Up** → Saved to database
2. **Login** → Authenticated via API
3. **Create Post** → Saved to database
4. **View Feed** → Shows posts from:
   - Users you follow
   - Your own posts
5. **Like/Comment** → Saved to database
6. **Follow Users** → Relationship saved in `follows` table

### Data Flow:
```
Frontend → API → Supabase Database
- All data persists in database
- localStorage only used for session (user object)
- Feed dynamically loads from API
```

## 🐛 Known Issues / TODO

1. **Post ownership check** - Currently checks by username, should check by user_id
2. **Comments loading** - Comments load when modal opens, but could be optimized
3. **Real-time updates** - Feed doesn't auto-refresh when new posts are created
4. **User profile page** - Not yet created
5. **Follow button UI** - Not yet added to posts

## 📝 Next Steps

1. Create User Profile page component
2. Add Follow/Unfollow button to posts
3. Add user search in Navbar
4. Add real-time feed updates
5. Improve error handling and loading states

