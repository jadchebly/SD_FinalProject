# Database Relationships Analysis

## Current Issues from User Perspective

### 1. **Authentication Split** ❌
- **Frontend**: Uses `localStorage` for signup/login (AuthContext.tsx)
- **Backend**: Has `/api/signup` endpoint that saves to database
- **Problem**: Frontend signup doesn't call backend API, so users exist in two places:
  - localStorage (for frontend auth)
  - Database (only if they use the curl command or create a post)

**Impact**: Users can sign up but their account isn't in the database until they create a post.

### 2. **Posts Storage Duplication** ⚠️
- Posts are saved to **BOTH** database AND localStorage
- Dashboard only reads from **localStorage** (line 30: `posts.filter((post) => post.user === user.username)`)
- Database posts are never fetched or displayed

**Impact**: 
- Posts created via API go to database but don't show in dashboard
- Dashboard only shows localStorage posts
- Data is out of sync

### 3. **User Identification Mismatch** ❌
- **Frontend**: Uses `user.username` (string) to identify posts
- **Database**: Uses `user_id` (UUID) to link posts to users
- **Post creation**: Creates placeholder users if they don't exist in database

**Impact**:
- User signs up in frontend → gets UUID in localStorage
- User creates post → backend creates placeholder user with different UUID
- Posts reference different user IDs in different places

### 4. **No Following System** ❌
- Dashboard only shows **current user's own posts** (line 30)
- No way to follow other users
- No feed of posts from followed users
- SuggestedUsersModal was removed

**Impact**: Users can't see posts from others, making it not a social platform.

### 5. **Likes/Comments Not in Database** ❌
- Likes stored in localStorage only (`likers` array in Post type)
- Comments stored in localStorage only
- No database tables for `likes` or `comments` relationships

**Impact**: 
- Likes/comments are lost on refresh if not in localStorage
- Can't query "who liked this post" from database
- No cross-user interaction data

### 6. **Data Flow Issues** ⚠️

**Current Flow:**
```
User Signs Up (Frontend)
  → Saved to localStorage only
  → NOT in database

User Creates Post
  → Saved to database (with placeholder user if needed)
  → Saved to localStorage
  → Dashboard reads from localStorage only
```

**What Should Happen:**
```
User Signs Up
  → Saved to database
  → Frontend gets user data from database

User Creates Post
  → Saved to database
  → Dashboard fetches posts from database
  → Shows posts from user + followed users
```

## Recommended Fixes

### Priority 1: Unify Authentication
1. Update `AuthContext.tsx` to call `/api/signup` and `/api/login` endpoints
2. Remove localStorage-based user storage
3. Store JWT token or session from backend

### Priority 2: Fix Post Display
1. Create `/api/posts` GET endpoint to fetch posts from database
2. Update Dashboard to fetch from API instead of localStorage
3. Remove localStorage post storage (or keep as cache)

### Priority 3: Implement Following System
1. Create `follows` table in database (follower_id, following_id)
2. Create API endpoints: `/api/follow/:userId`, `/api/unfollow/:userId`
3. Update Dashboard to show posts from followed users + own posts
4. Add "Follow" button on user profiles

### Priority 4: Move Likes/Comments to Database
1. Create `likes` table (user_id, post_id)
2. Create `comments` table (id, post_id, user_id, text, created_at)
3. Update frontend to call API for likes/comments
4. Remove localStorage-based likes/comments

### Priority 5: Fix User ID Consistency
1. Use UUID from database for all user references
2. Update Post type to use `user_id` instead of `user` (username)
3. Join with users table to get username when displaying

## Database Schema Should Be:

```sql
users
  - id (UUID, primary key)
  - username
  - email
  - password_hash
  - avatar_url

posts
  - id (UUID, primary key)
  - user_id (UUID, foreign key → users.id)
  - title
  - content
  - type
  - image_url
  - video_url
  - created_at

follows
  - follower_id (UUID, foreign key → users.id)
  - following_id (UUID, foreign key → users.id)
  - created_at
  - PRIMARY KEY (follower_id, following_id)

likes
  - user_id (UUID, foreign key → users.id)
  - post_id (UUID, foreign key → posts.id)
  - created_at
  - PRIMARY KEY (user_id, post_id)

comments
  - id (UUID, primary key)
  - post_id (UUID, foreign key → posts.id)
  - user_id (UUID, foreign key → users.id)
  - text
  - created_at
```

## Current State Summary

✅ **What Works:**
- Users can sign up (localStorage)
- Users can create posts (saved to both places)
- Users can delete their own posts
- Images upload to Supabase Storage

❌ **What Doesn't Work:**
- Users can't see posts from others
- Signup doesn't save to database
- Posts from database don't show in dashboard
- No following system
- Likes/comments not persisted

⚠️ **What's Inconsistent:**
- Data exists in two places (localStorage + database)
- User IDs don't match between frontend and backend
- Posts reference users differently in different places

