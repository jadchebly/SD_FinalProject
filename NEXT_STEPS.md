# Next Steps - Action Plan

## 🎯 Immediate Next Steps (Priority Order)

### Step 1: Setup & Test Foundation ⚡ (Do This First)

**1.1 Create Database Tables**
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Copy and run the SQL from `backend/database-schema.sql`
- [ ] Verify all 5 tables exist: `users`, `posts`, `follows`, `likes`, `comments`

**1.2 Test Basic Functionality**
- [ ] Sign up a new user (frontend)
- [ ] Verify user appears in Supabase `users` table
- [ ] Create a post
- [ ] Verify post appears in Supabase `posts` table
- [ ] Test like a post → check `likes` table
- [ ] Test comment on post → check `comments` table

**1.3 Fix Any Issues Found**
- [ ] Check browser console for errors
- [ ] Check backend terminal for errors
- [ ] Fix any database connection issues
- [ ] Fix any API errors

---

### Step 2: Add Follow/Unfollow UI 🔄

**2.1 Add Follow Button to Posts**
- [ ] Update Dashboard to show "Follow" button on posts from users you don't follow
- [ ] Button should call `api.followUser()` or `api.unfollowUser()`
- [ ] Update button text based on follow status
- [ ] Refresh feed after following/unfollowing

**2.2 Add Follow Button to User Profiles**
- [ ] (Will be done in Step 3 when we create profile page)

**Files to modify:**
- `src/components/Dashboard/Dashboard.tsx` - Add follow button to post cards

---

### Step 3: Create User Profile Page 👤

**3.1 Create Profile Component**
- [ ] Create `src/pages/UserProfile.tsx`
- [ ] Display user info (username, avatar, follower/following counts)
- [ ] Show "Follow" or "Unfollow" button
- [ ] Display user's posts
- [ ] Add route in `App.tsx`: `/profile/:userId`

**3.2 Add Navigation to Profiles**
- [ ] Make usernames clickable in posts
- [ ] Link to `/profile/:userId`
- [ ] Update Navbar to link to own profile

**Files to create:**
- `src/pages/UserProfile.tsx`
- `src/pages/UserProfile.css`

**Files to modify:**
- `src/App.tsx` - Add route
- `src/components/Dashboard/Dashboard.tsx` - Make usernames clickable

---

### Step 4: Add User Search/Discovery 🔍

**4.1 Add Search to Navbar**
- [ ] Add search input to Navbar
- [ ] Call `api.searchUsers()` as user types
- [ ] Show dropdown with search results
- [ ] Click result → navigate to user profile

**4.2 Add Suggested Users**
- [ ] Create component to show suggested users to follow
- [ ] Show users you're not following
- [ ] Display on dashboard or separate page

**Files to modify:**
- `src/components/Dashboard/Navbar/Navbar.tsx` - Add search
- `src/components/Dashboard/Navbar/Navbar.css` - Style search

**Files to create (optional):**
- `src/components/SuggestedUsers.tsx` - Suggested users component

---

### Step 5: Polish & Enhancements ✨

**5.1 Improve Feed**
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add "Refresh" button
- [ ] Auto-refresh when new posts are created

**5.2 Improve Comments**
- [ ] Show comment count on post cards
- [ ] Load comments when modal opens (already done, verify it works)
- [ ] Add ability to delete own comments

**5.3 Improve User Experience**
- [ ] Add loading spinners
- [ ] Add success/error toast notifications
- [ ] Add confirmation dialogs for destructive actions
- [ ] Improve mobile responsiveness

**5.4 Fix Post Ownership Check**
- [ ] Currently checks by username, should check by user_id
- [ ] Update delete button visibility logic

---

### Step 6: Security & Production Readiness 🔒

**6.1 Password Hashing**
- [ ] Install `bcrypt` in backend
- [ ] Hash passwords on signup
- [ ] Compare hashed passwords on login
- [ ] Remove plain text password storage

**6.2 Authentication**
- [ ] Implement JWT tokens
- [ ] Add token to API requests
- [ ] Add token refresh logic
- [ ] Add logout that clears token

**6.3 Error Handling**
- [ ] Add proper error messages
- [ ] Add error boundaries in React
- [ ] Log errors properly
- [ ] Handle network failures gracefully

**6.4 Environment Variables**
- [ ] Verify all secrets are in `.env`
- [ ] Add `.env.example` file
- [ ] Document required environment variables

---

## 📋 Quick Start Checklist

**Before you start coding, make sure:**

- [ ] Database tables are created
- [ ] Backend is running without errors
- [ ] Frontend is running without errors
- [ ] You can sign up and login
- [ ] You can create posts
- [ ] Basic functionality works

**Then proceed with:**
1. ✅ Test everything works (Step 1)
2. ✅ Add Follow button to posts (Step 2)
3. ✅ Create User Profile page (Step 3)
4. ✅ Add User Search (Step 4)
5. ✅ Polish and enhance (Step 5)

---

## 🚀 Recommended Order

**Week 1: Foundation**
- Step 1: Setup & Test
- Step 2: Follow/Unfollow UI

**Week 2: Core Features**
- Step 3: User Profile Page
- Step 4: User Search

**Week 3: Polish**
- Step 5: Enhancements
- Step 6: Security (if needed for production)

---

## 💡 Quick Wins (Easy to Implement First)

1. **Follow Button on Posts** (30 min)
   - Add button next to username
   - Call API on click
   - Update button state

2. **Clickable Usernames** (15 min)
   - Make username link to profile
   - Create basic profile page route

3. **User Search in Navbar** (1 hour)
   - Add search input
   - Show dropdown results
   - Navigate on click

---

## 🐛 Common Issues to Watch For

1. **CORS errors** → Check backend CORS config
2. **401 Unauthorized** → Check `x-user-id` header is being sent
3. **Posts not showing** → Check if you're following the user
4. **Database errors** → Check RLS policies in Supabase
5. **Image upload fails** → Check Supabase Storage bucket permissions

---

## 📝 Notes

- All backend APIs are ready - you just need to add UI
- Test each feature as you build it
- Use browser DevTools to debug API calls
- Check Supabase dashboard to verify data is being saved

---

## 🎯 What Success Looks Like

When you're done, users should be able to:
- ✅ Sign up and login
- ✅ Create posts with images
- ✅ See posts from users they follow
- ✅ Like and comment on posts
- ✅ Follow/unfollow users
- ✅ View user profiles
- ✅ Search for users
- ✅ Delete their own posts

Good luck! 🚀

