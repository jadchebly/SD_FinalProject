# Testing Guide - Social Media App

## Prerequisites

1. **Backend is running:**
   ```bash
   cd backend
   npm run dev
   ```
   Should see: `Server running on http://localhost:3000`

2. **Frontend is running:**
   ```bash
   npm run dev
   ```
   Should see: `Local: http://localhost:5173` (or similar)

3. **Database tables created:**
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL from `backend/database-schema.sql`
   - This creates: `follows`, `likes`, `comments` tables

## Test Checklist

### ✅ 1. Database Setup Test

**Check if tables exist:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'posts', 'follows', 'likes', 'comments');
```

**Expected:** All 5 tables should exist

---

### ✅ 2. Sign Up Test

**Steps:**
1. Go to `/signup` page
2. Enter:
   - Username: `testuser1`
   - Email: `test1@example.com`
   - Password: `password123`
3. Click "Sign Up"

**Expected:**
- ✅ Redirects to dashboard
- ✅ User is logged in
- ✅ Check Supabase → `users` table → new user should appear

**Test with duplicate:**
- Try signing up with same email again
- **Expected:** Error message "Email already registered"

---

### ✅ 3. Login Test

**Steps:**
1. Logout (if logged in)
2. Go to `/login` page
3. Enter:
   - Email: `test1@example.com`
   - Password: `password123`
4. Click "Login"

**Expected:**
- ✅ Redirects to dashboard
- ✅ User is logged in
- ✅ Can see dashboard

**Test with wrong password:**
- Enter wrong password
- **Expected:** Error message "Invalid email or password"

---

### ✅ 4. Create Post Test

**Steps:**
1. Make sure you're logged in
2. Go to `/create-post` page
3. Fill in:
   - Title: `My First Post`
   - Content: `This is a test post`
   - Type: `Blurb`
4. Click "Post"

**Expected:**
- ✅ Post is created
- ✅ Redirects to dashboard
- ✅ Post appears in dashboard
- ✅ Check Supabase → `posts` table → new post should appear

**Test with image:**
1. Create a post with Type: `Photo`
2. Upload an image
3. Click "Post"

**Expected:**
- ✅ Image uploads to Supabase Storage
- ✅ Post shows image in dashboard

---

### ✅ 5. Feed Test (Posts from Followed Users)

**Current Behavior:**
- Dashboard shows posts from:
  - Users you follow
  - Your own posts

**Steps:**
1. Create 2-3 test users (via signup or curl)
2. Create posts from different users
3. Check your dashboard

**Expected:**
- ✅ Only your own posts show (since you haven't followed anyone yet)
- ✅ After following users, their posts should appear

**Test with curl:**
```bash
# Create another user
curl -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"user2","email":"user2@example.com","password":"pass123"}'

# Get the user ID from response, then create a post as that user
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "x-user-id: USER_ID_FROM_SIGNUP" \
  -d '{"title":"User2 Post","content":"Content","type":"blurb","user_id":"USER_ID","username":"user2"}'
```

---

### ✅ 6. Like Post Test

**Steps:**
1. View a post in dashboard
2. Click the like button (thumbs up icon)
3. Click again to unlike

**Expected:**
- ✅ Like count increases when clicked
- ✅ Like count decreases when clicked again
- ✅ Button shows "liked" state when you've liked it
- ✅ Check Supabase → `likes` table → like relationship should appear/disappear

**Test with multiple users:**
1. Like a post as user1
2. Logout, login as user2
3. Like the same post
4. **Expected:** Like count shows 2

---

### ✅ 7. Comment on Post Test

**Steps:**
1. Click on a post to open modal
2. Scroll to comments section
3. Type a comment: `This is a test comment`
4. Click "Post" or press Enter

**Expected:**
- ✅ Comment appears in the list
- ✅ Comment shows your username
- ✅ Check Supabase → `comments` table → comment should appear

**Test multiple comments:**
- Add 2-3 comments
- **Expected:** All comments appear in order

---

### ✅ 8. Delete Post Test

**Steps:**
1. Create a post with an image
2. View the post in dashboard
3. Click the trash icon
4. Confirm deletion

**Expected:**
- ✅ Confirmation modal appears
- ✅ Post is deleted after confirmation
- ✅ Post disappears from dashboard
- ✅ If post had image, image is deleted from Supabase Storage
- ✅ Check Supabase → `posts` table → post should be gone

---

### ✅ 9. Follow/Unfollow Test (via API)

**Steps:**
1. Get your user ID (from localStorage or database)
2. Get another user's ID
3. Test follow:

```bash
curl -X POST http://localhost:3000/api/follow/OTHER_USER_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID"
```

**Expected:**
- ✅ Response: `{"success": true, "message": "User followed successfully"}`
- ✅ Check Supabase → `follows` table → relationship should appear

4. Test unfollow:

```bash
curl -X DELETE http://localhost:3000/api/follow/OTHER_USER_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID"
```

**Expected:**
- ✅ Response: `{"success": true, "message": "User unfollowed successfully"}`
- ✅ Check Supabase → `follows` table → relationship should be gone

5. Test feed after following:
   - Follow a user who has posts
   - Refresh dashboard
   - **Expected:** Their posts should appear in your feed

---

### ✅ 10. Get User Profile Test (via API)

**Steps:**
```bash
curl -X GET http://localhost:3000/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID"
```

**Expected:**
- ✅ Response includes:
  - User info (id, username, email, avatar_url)
  - `followerCount`
  - `followingCount`
  - `isFollowing` (true/false)

---

### ✅ 11. Search Users Test (via API)

**Steps:**
```bash
curl -X GET "http://localhost:3000/api/users/search/test" \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID"
```

**Expected:**
- ✅ Response includes array of users matching "test" in username
- ✅ Each user has `isFollowing` status

---

### ✅ 12. Feed API Test

**Steps:**
```bash
curl -X GET http://localhost:3000/api/feed \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID"
```

**Expected:**
- ✅ Response includes `posts` array
- ✅ Posts include:
  - Post data (title, content, etc.)
  - User info (username, avatar)
  - Like count
  - Comments count
  - `hasLiked` status

---

## Common Issues & Fixes

### Issue: "Failed to get feed"
**Fix:** 
- Check if user is logged in (check localStorage for 'user')
- Check if `x-user-id` header is being sent
- Check backend logs for errors

### Issue: "Post not showing in feed"
**Fix:**
- Make sure you're following the user who created the post
- Or make sure it's your own post
- Check Supabase `posts` table to verify post exists

### Issue: "Like not working"
**Fix:**
- Check browser console for errors
- Verify `likes` table exists in database
- Check if RLS policies allow inserts

### Issue: "Comments not loading"
**Fix:**
- Check browser console for errors
- Verify `comments` table exists
- Check if comments are being fetched when modal opens

### Issue: "Can't follow user"
**Fix:**
- Verify `follows` table exists
- Check RLS policies on `follows` table
- Make sure you're not trying to follow yourself

---

## Database Verification Queries

**Check all your data:**

```sql
-- Count users
SELECT COUNT(*) FROM users;

-- Count posts
SELECT COUNT(*) FROM posts;

-- Count follows
SELECT COUNT(*) FROM follows;

-- Count likes
SELECT COUNT(*) FROM likes;

-- Count comments
SELECT COUNT(*) FROM comments;

-- See all follows
SELECT 
  f1.username AS follower,
  f2.username AS following
FROM follows
JOIN users f1 ON follows.follower_id = f1.id
JOIN users f2 ON follows.following_id = f2.id;

-- See all posts with user info
SELECT 
  p.title,
  u.username,
  p.created_at
FROM posts p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;
```

---

## Quick Test Script

Run this to test all endpoints:

```bash
# 1. Sign up
USER1=$(curl -s -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","email":"test1@test.com","password":"pass123"}' | jq -r '.user.id')

# 2. Sign up second user
USER2=$(curl -s -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test2","email":"test2@test.com","password":"pass123"}' | jq -r '.user.id')

# 3. Create post as user1
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER1" \
  -d "{\"title\":\"Test Post\",\"content\":\"Content\",\"type\":\"blurb\",\"user_id\":\"$USER1\",\"username\":\"test1\"}"

# 4. Follow user2
curl -X POST http://localhost:3000/api/follow/$USER2 \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER1"

# 5. Get feed
curl -X GET http://localhost:3000/api/feed \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER1"
```

---

## What Should Work Now

✅ Sign up creates user in database  
✅ Login authenticates via API  
✅ Posts are saved to database  
✅ Feed shows posts from followed users + own posts  
✅ Likes are saved to database  
✅ Comments are saved to database  
✅ Delete post removes from database and storage  
✅ Follow/unfollow relationships work  

## What Still Needs UI

⚠️ Follow button on posts (backend ready)  
⚠️ User profile page (backend ready)  
⚠️ User search in Navbar (backend ready)  

---

## Next Steps After Testing

1. If all tests pass → Add UI components for follow/profile/search
2. If tests fail → Check error messages and fix issues
3. Test with multiple users to verify social features work

