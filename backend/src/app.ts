import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { db, dbAdmin } from './config/database';
import { uploadImageToS3, deleteImageFromS3 } from './services/s3Service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return callback(null, true);
    }
    
    // Use production URL if in production, otherwise use development URL
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = isProduction 
      ? process.env.FRONTEND_URL_PRODUCTION 
      : process.env.FRONTEND_URL;
    
    const allowedOrigins = [
      frontendUrl,
      'http://localhost:5173',
      'http://localhost:5174',
    ].filter(Boolean);
    
    // Check exact match first
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In production, also allow Azure Static Web Apps domains
    // Azure Static Web Apps can have different subdomains (e.g., .1., .2., .3., etc.)
    if (isProduction && origin.includes('.azurestaticapps.net')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

app.get('/test-db', async (req, res) => {
  try {
    // Test basic connection
    const { data, error } = await db.from('users').select('id').limit(1);

    if (error) {
      if (error.message && (error.message.includes('does not exist') || error.message.includes('relation'))) {
        return res.json({
          success: true,
          database: 'connected',
          message: 'AWS RDS PostgreSQL connected! (Tables may not be created yet)',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      database: 'connected',
      message: 'AWS RDS PostgreSQL connection successful!',
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('File:', req.file ? `${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})` : 'none');
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Uploading to S3...');
    const result = await uploadImageToS3(req.file);
    console.log('Upload successful:', result.url);
    
    res.json({
      success: true,
      url: result.url,
      path: result.path,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    console.log('Creating user:', { username, email });

    // Check if user already exists
    const { data: existingUsers } = await db
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`);

    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Generate a UUID for the user
    const userId = randomUUID();

    // In production, you should hash the password with bcrypt
    // For now, we'll store it as plain text (NOT SECURE - for development only!)
    const passwordHash = password; // TODO: Use bcrypt in production

    // Create user in database
    const { data: newUser, error: createError } = await db
      .from('users')
      .insert({
        id: userId,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        avatar_url: null,
      })
      .select('id, username, email, avatar_url')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', newUser.id);

    res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar_url || null,
      },
    });
    // Set a simple HttpOnly session cookie so frontend can rehydrate without localStorage
    try {
      res.cookie('sid', newUser.id, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
    } catch (e) {
      // ignore cookie errors
    }
  } catch (error: any) {
    console.error('Signup error:', error);
    const errorMessage = error?.message || error?.error || 'Failed to create account';
    const errorDetails = error?.details || error?.hint || '';
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails,
    });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('Login attempt for:', email);

    // Find user by email
    const { data: user, error: userError } = await db
      .from('users')
      .select('id, username, email, password_hash, avatar_url')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // In production, use bcrypt to compare hashed passwords
    // For now, simple comparison (NOT SECURE - for development only!)
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Login successful for:', user.username);
    console.log('User avatar_url from DB:', user.avatar_url ? `present (length: ${user.avatar_url.length})` : 'null/empty');

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar_url && user.avatar_url.trim() !== '' ? user.avatar_url : null,
      },
    });
    // Set HttpOnly cookie on login so client can rehydrate session
    try {
      res.cookie('sid', user.id, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
    } catch (e) {
      // ignore cookie set errors
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to login',
    });
  }
});

// Get current authenticated user (rehydration endpoint)
app.get('/api/me', async (req, res) => {
  try {
    let currentUserId = req.headers['x-user-id'] as string | undefined;
    // If header not present, attempt to read cookie 'sid' from Cookie header
    if (!currentUserId && req.headers.cookie) {
      const cookieHeader = req.headers.cookie as string;
      const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
        const [k,v] = c.split('=');
        return [k.trim(), decodeURIComponent((v||'').trim())];
      }));
      if (cookies['sid']) currentUserId = cookies['sid'];
    }

    if (!currentUserId) {
      return res.status(200).json({ success: true, user: null });
    }

    const { data: user, error } = await db
      .from('users')
      .select('id, username, email, avatar_url')
      .eq('id', currentUserId)
      .single();

    if (error || !user) {
      return res.status(200).json({ success: true, user: null });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar_url || null,
      },
    });
  } catch (error: any) {
    console.error('GET /api/me error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to get current user' });
  }
});

// Get list of user ids that the current user is following
app.get('/api/following', async (req, res) => {
  try {
    let currentUserId = req.headers['x-user-id'] as string | undefined;
    if (!currentUserId && req.headers.cookie) {
      const cookieHeader = req.headers.cookie as string;
      const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
        const [k,v] = c.split('=');
        return [k.trim(), decodeURIComponent((v||'').trim())];
      }));
      if (cookies['sid']) currentUserId = cookies['sid'];
    }

    if (!currentUserId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { data: follows, error } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    if (error) throw error;

    const followingIds = follows?.map((f: any) => f.following_id) || [];
    res.json({ success: true, following: followingIds });
  } catch (error: any) {
    console.error('GET /api/following error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to get following list' });
  }
});

// Logout endpoint (clears server session if any)
app.post('/api/logout', async (req, res) => {
  try {
    // If you implement server-side sessions/cookies later, clear them here.
    // For now, this is a no-op that returns success so frontend can clear in-memory state.
    try {
      res.clearCookie('sid');
    } catch (e) {
      // ignore
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/logout error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to logout' });
  }
});

// Get user profile
// Suggested users for a user (users the current user is not following)
app.get('/api/users/suggested', async (req, res) => {
  try {
    const currentUserId = req.headers['x-user-id'] as string | undefined;

    // Get list of users the current user is following (if logged in)
    let followingIds: string[] = [];
    if (currentUserId) {
      const { data: follows } = await db
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      followingIds = follows?.map(f => f.following_id) || [];
    }

    // Fetch candidate users (limit to 100 for efficiency) and filter in JS
    const { data: usersRaw, error } = await dbAdmin
      .from('users')
      .select('id, username, avatar_url, email')
      .limit(100);

    if (error) throw error;

    const excludeSet = new Set([currentUserId, ...(followingIds || [])]);
    const candidates = (usersRaw || []).filter((u: any) => !excludeSet.has(u.id));

    // Shuffle and pick up to 5 suggestions
    const shuffled = candidates.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5).map((u: any) => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar_url || null,
      email: u.email || null,
      isFollowing: false,
    }));

    res.json({ success: true, users: selected });
  } catch (error: any) {
    console.error('Get suggested users error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to get suggested users' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.headers['x-user-id'] as string;

    const { data: user, error } = await db
      .from('users')
      .select('id, username, email, avatar_url, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get follow status if current user is logged in
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      const { data: follow } = await db
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', id)
        .single();
      isFollowing = !!follow;
    }

    // Get follower/following counts
    const { count: followerCount } = await db
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id);

    const { count: followingCount } = await db
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', id);

    res.json({
      success: true,
      user: {
        ...user,
        followerCount: followerCount || 0,
        followingCount: followingCount || 0,
        isFollowing,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get user',
    });
  }
});

// Follow user
app.post('/api/follow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.headers['x-user-id'] as string;

    if (!followerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (followerId === userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const { data: existing } = await db
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    const { error } = await db
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: userId,
      });

    if (error) {
      throw error;
    }

    res.json({ success: true, message: 'User followed successfully' });
  } catch (error: any) {
    console.error('Follow error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to follow user',
    });
  }
});

// Unfollow user
app.delete('/api/follow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.headers['x-user-id'] as string;

    if (!followerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { error } = await db
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', userId);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: 'User unfollowed successfully' });
  } catch (error: any) {
    console.error('Unfollow error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to unfollow user',
    });
  }
});

// Update user avatar
app.put('/api/users/:id/avatar', async (req, res) => {
  try {
    const { id } = req.params;
    const { avatar_url } = req.body;
    const currentUserId = req.headers['x-user-id'] as string;

    if (!currentUserId || currentUserId !== id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!avatar_url || (typeof avatar_url === 'string' && avatar_url.trim() === '')) {
      return res.status(400).json({ error: 'Avatar URL is required' });
    }

    // Normalize: convert empty string to null
    const normalizedAvatarUrl = (typeof avatar_url === 'string' && avatar_url.trim() === '') ? null : avatar_url;
    
    console.log(`Updating avatar for user ${id}, avatar_url length: ${normalizedAvatarUrl?.length || 0}`);

    const { data: updatedUser, error } = await db
      .from('users')
      .update({ avatar_url: normalizedAvatarUrl })
      .eq('id', id)
      .select('id, username, email, avatar_url')
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    if (!updatedUser) {
      throw new Error('User not found after update');
    }

    console.log(`Avatar updated successfully for user ${id}, avatar_url: ${updatedUser.avatar_url ? 'present' : 'null'}`);

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar_url || null,
      },
    });
  } catch (error: any) {
    console.error('Update avatar error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to update avatar',
    });
  }
});

// Get followers list
app.get('/api/users/:id/followers', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.headers['x-user-id'] as string;

    // Get all users who follow this user
    const { data: follows, error: followsError } = await db
      .from('follows')
      .select('follower_id')
      .eq('following_id', id);

    if (followsError) {
      throw followsError;
    }

    const followerIds = follows?.map(f => f.follower_id) || [];
    
    if (followerIds.length === 0) {
      return res.json({ success: true, users: [] });
    }

    // Get user details for followers
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id, username, email, avatar_url')
      .in('id', followerIds);

    if (usersError) {
      throw usersError;
    }

    // Get follow status for each user (if current user is logged in)
    let followingIds = new Set<string>();
    if (currentUserId) {
      const { data: currentUserFollows } = await db
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', followerIds);
      
      followingIds = new Set(currentUserFollows?.map(f => f.following_id) || []);
    }

    const usersWithFollowStatus = users?.map(user => ({
      ...user,
      isFollowing: followingIds.has(user.id),
    })) || [];

    res.json({
      success: true,
      users: usersWithFollowStatus,
    });
  } catch (error: any) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get followers',
    });
  }
});

// Get following list
app.get('/api/users/:id/following', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.headers['x-user-id'] as string;

    // Get all users this user follows
    const { data: follows, error: followsError } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', id);

    if (followsError) {
      throw followsError;
    }

    const followingIds = follows?.map(f => f.following_id) || [];
    
    if (followingIds.length === 0) {
      return res.json({ success: true, users: [] });
    }

    // Get user details for following
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id, username, email, avatar_url')
      .in('id', followingIds);

    if (usersError) {
      throw usersError;
    }

    // For following list, all users are already being followed by the profile owner
    // But we need to check if current user follows them
    let currentUserFollowingIds = new Set<string>();
    if (currentUserId) {
      const { data: currentUserFollows } = await db
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', followingIds);
      
      currentUserFollowingIds = new Set(currentUserFollows?.map(f => f.following_id) || []);
    }

    const usersWithFollowStatus = users?.map(user => ({
      ...user,
      isFollowing: currentUserFollowingIds.has(user.id),
    })) || [];

    res.json({
      success: true,
      users: usersWithFollowStatus,
    });
  } catch (error: any) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get following',
    });
  }
});

// Get feed (posts from followed users + own posts)
app.get('/api/feed', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get list of users being followed
    const { data: follows } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    const followingIds = follows?.map(f => f.following_id) || [];
    // Include own user ID to see own posts
    const userIds = [...followingIds, userId];

    // Get posts from followed users + self
    const { data: posts, error: postsError } = await db
      .from('posts')
      .select(`
        *,
        users:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (postsError) {
      throw postsError;
    }

    // Get likes for each post
    const postIds = posts?.map(p => p.id) || [];
    const { data: likes } = await db
      .from('likes')
      .select('user_id, post_id')
      .in('post_id', postIds);

    // Get comments count for each post
    const { data: comments } = await db
      .from('comments')
      .select('post_id')
      .in('post_id', postIds);

    // Combine data
    const postsWithDetails = posts?.map(post => {
      const postLikes = likes?.filter(l => l.post_id === post.id) || [];
      const postComments = comments?.filter(c => c.post_id === post.id) || [];
      const hasLiked = likes?.some(l => l.post_id === post.id && l.user_id === userId) || false;

      return {
        ...post,
        user: post.users?.username || 'Unknown',
        likes: postLikes.length,
        likers: postLikes.map(l => l.user_id),
        commentsCount: postComments.length,
        hasLiked,
      };
    }) || [];

    res.json({
      success: true,
      posts: postsWithDetails,
    });
  } catch (error: any) {
    console.error('Get feed error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get feed',
    });
  }
});

// Like post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if already liked
    const { data: existing } = await db
      .from('likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('post_id', id)
      .single();

    if (existing) {
      return res.json({ success: true, message: 'Already liked' });
    }

    const { error } = await db
      .from('likes')
      .insert({
        user_id: userId,
        post_id: id,
      });

    if (error) {
      throw error;
    }

    res.json({ success: true, message: 'Post liked' });
  } catch (error: any) {
    console.error('Like error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to like post',
    });
  }
});

// Unlike post
app.delete('/api/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { error } = await db
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', id);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: 'Post unliked' });
  } catch (error: any) {
    console.error('Unlike error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to unlike post',
    });
  }
});

// Get comments for a post
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: comments, error } = await db
      .from('comments')
      .select(`
        *,
        users:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const formattedComments = comments?.map(comment => ({
      id: comment.id,
      text: comment.text,
      user: comment.users?.username || 'Unknown',
      userPhoto: comment.users?.avatar_url || null,
      createdAt: comment.created_at,
    })) || [];

    res.json({
      success: true,
      comments: formattedComments,
    });
  } catch (error: any) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get comments',
    });
  }
});

// Add comment to post
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const { data: comment, error } = await db
      .from('comments')
      .insert({
        post_id: id,
        user_id: userId,
        text: text.trim(),
      })
      .select(`
        *,
        users:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      comment: {
        id: comment.id,
        text: comment.text,
        user: comment.users?.username || 'Unknown',
        userPhoto: comment.users?.avatar_url || null,
        createdAt: comment.created_at,
      },
    });
  } catch (error: any) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to add comment',
    });
  }
});

// Get suggested users (users not followed by current user, excluding current user)
app.get('/api/users/suggested', async (req, res) => {
  try {
    const currentUserId = req.headers['x-user-id'] as string;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get list of users being followed
    const { data: follows } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    const followingIds = follows?.map(f => f.following_id) || [];
    // Include current user ID to exclude from results
    const excludeIds = [...followingIds, currentUserId];

    // Get all users
    const { data: allUsers, error } = await db
      .from('users')
      .select('id, username, email, avatar_url');

    if (error) {
      throw error;
    }

    // Filter out current user and already followed users
    const users = allUsers?.filter(u => !excludeIds.includes(u.id)) || [];

    // Randomly select up to 5 users
    const shuffled = users ? [...users].sort(() => 0.5 - Math.random()) : [];
    const selected = shuffled.slice(0, 5);

    res.json({
      success: true,
      users: selected.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar_url || undefined,
      })),
    });
  } catch (error: any) {
    console.error('Get suggested users error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get suggested users',
    });
  }
});

// Search users
app.get('/api/users/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const currentUserId = req.headers['x-user-id'] as string;

    if (!query || query.trim().length < 1) {
      return res.json({ success: true, users: [] });
    }

    const { data: users, error } = await db
      .from('users')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .limit(10);

    if (error) {
      throw error;
    }

    // Get follow status for each user
    const userIds = users?.map(u => u.id) || [];
    const { data: follows } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId || '')
      .in('following_id', userIds);

    const followingIds = new Set(follows?.map(f => f.following_id) || []);

    const usersWithFollowStatus = users?.map(user => ({
      ...user,
      isFollowing: followingIds.has(user.id),
    })) || [];

    res.json({
      success: true,
      users: usersWithFollowStatus,
    });
  } catch (error: any) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to search users',
    });
  }
});

// Suggested users for a user (users the current user is not following)
app.get('/api/users/suggested', async (req, res) => {
  try {
    const currentUserId = req.headers['x-user-id'] as string | undefined;

    // Get list of users the current user is following (if logged in)
    let followingIds: string[] = [];
    if (currentUserId) {
      const { data: follows } = await db
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      followingIds = follows?.map(f => f.following_id) || [];
    }

    // Fetch candidate users (limit to 100 for efficiency) and filter in JS
    const { data: usersRaw, error } = await dbAdmin
      .from('users')
      .select('id, username, avatar_url, email')
      .limit(100);

    if (error) throw error;

    const excludeSet = new Set([currentUserId, ...(followingIds || [])]);
    const candidates = (usersRaw || []).filter((u: any) => !excludeSet.has(u.id));

    // Shuffle and pick up to 5 suggestions
    const shuffled = candidates.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5).map((u: any) => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar_url || null,
      email: u.email || null,
      isFollowing: false,
    }));

    res.json({ success: true, users: selected });
  } catch (error: any) {
    console.error('Get suggested users error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to get suggested users' });
  }
});

// Get posts endpoint (supports filtering by user_id query parameter)
app.get('/api/posts', async (req, res) => {
  try {
    const userId = req.query.user_id as string;
    const currentUserId = req.headers['x-user-id'] as string;

    let query = dbAdmin
      .from('posts')
      .select(`
        *,
        users:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    // If user_id is provided, filter by that user
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      throw postsError;
    }

    if (!posts || posts.length === 0) {
      return res.json({
        success: true,
        posts: [],
      });
    }

    // Get likes for each post (using admin client to bypass RLS)
    const postIds = posts.map(p => p.id);
    const { data: likes } = await dbAdmin
      .from('likes')
      .select('user_id, post_id')
      .in('post_id', postIds);

    // Get comments count for each post (using admin client to bypass RLS)
    const { data: comments } = await dbAdmin
      .from('comments')
      .select('post_id')
      .in('post_id', postIds);

    // Combine data
    const postsWithDetails = posts.map(post => {
      const postLikes = likes?.filter(l => l.post_id === post.id) || [];
      const postComments = comments?.filter(c => c.post_id === post.id) || [];
      const hasLiked = currentUserId ? likes?.some(l => l.post_id === post.id && l.user_id === currentUserId) || false : false;

      return {
        ...post,
        user: post.users?.username || 'Unknown',
        likes: postLikes.length,
        likers: postLikes.map(l => l.user_id),
        commentsCount: postComments.length,
        hasLiked,
      };
    });

    res.json({
      success: true,
      posts: postsWithDetails,
    });
  } catch (error: any) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get posts',
    });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, type, image_url, video_url, user_id, username } = req.body;

    if (!title || !content || !type) {
      return res.status(400).json({ error: 'Title, content, and type are required' });
    }

    // Trim and validate title and content
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle.length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    if (trimmedContent.length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('Creating post:', { title, type, user_id, username, hasImage: !!image_url });

    let userId = user_id;
    
    const { data: existingUser, error: userCheckError } = await db
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (!existingUser && username) {
      console.log('User not found, creating user entry...');
      try {
        const { data: newUser, error: createUserError } = await db
          .from('users')
          .insert({
            id: user_id,
            username: username,
            email: `${username}@temp.com`, 
            password_hash: 'temp',
          })
          .select()
          .single();

        if (createUserError) {
          console.error('Error creating user:', createUserError);
          const { data: userByUsername } = await db
            .from('users')
            .select('id')
            .eq('username', username)
            .single();
          
          if (userByUsername) {
            console.log('Found user by username:', userByUsername.id);
            userId = userByUsername.id;
          } else {
            throw new Error(`Cannot create post: User ${user_id} does not exist and could not be created: ${createUserError.message}`);
          }
        } else {
          console.log('User created:', newUser.id);
          userId = newUser.id;
        }
      } catch (err) {
        console.error('User creation failed:', err);
        throw err;
      }
    } else if (existingUser) {
      userId = existingUser.id;
    }

    // Prepare insert data - only include image_url/video_url if they have actual values
    const insertData: any = {
      user_id: userId,
      title: trimmedTitle,
      content: trimmedContent,
      type,
    };

    if (image_url && typeof image_url === 'string' && image_url.trim() !== '') {
      insertData.image_url = image_url.trim();
    } else {
      insertData.image_url = null;
    }

    if (video_url && typeof video_url === 'string' && video_url.trim() !== '') {
      insertData.video_url = video_url.trim();
    } else {
      insertData.video_url = null;
    }

    console.log('Inserting post with data:', { ...insertData, image_url: insertData.image_url ? 'present' : 'null', video_url: insertData.video_url ? 'present' : 'null' });

    const { data, error } = await db
      .from('posts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error hint:', error.hint);
      console.error('Insert data attempted:', { ...insertData, image_url: insertData.image_url ? 'present' : 'null', video_url: insertData.video_url ? 'present' : 'null' });
      
      // Provide more helpful error messages
      if (error.code === '23514') {
        // Check constraint violation - likely requires media for certain post types
        const constraintMsg = error.message || error.hint || '';
        if (constraintMsg.includes('image_url') || constraintMsg.includes('video_url')) {
          throw new Error(`This post type may require media. For "blurb" posts, you can create posts without images or videos. Please check your database constraints or try adding an image/video.`);
        }
        throw new Error(`Database constraint violation: ${constraintMsg || 'Please ensure your post data meets all database requirements.'}`);
      } else if (error.code === '23502') {
        throw new Error('Required fields are missing. Please check your post data.');
      } else if (error.code === '23503') {
        throw new Error('Invalid user reference. Please try logging in again.');
      }
      
      throw error;
    }

    console.log('Post created successfully:', data.id);

    res.json({
      success: true,
      post: data,
    });
  } catch (error: any) {
    console.error('Create post error:', error);
    const errorMessage = error?.message || error?.error || 'Failed to create post';
    const errorDetails = error?.details || error?.hint || '';
    
    console.error('Error details:', errorDetails);
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails,
    });
  }
});

// Update post endpoint
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const user_id = req.headers['x-user-id'] as string;

    console.log('✏️ PUT /api/posts/:id called');
    console.log('✏️ Post ID:', id);
    console.log('✏️ User ID from header:', user_id);
    console.log('✏️ Title:', title);
    console.log('✏️ Content:', content);

    if (!user_id) {
      console.error('❌ No user ID provided');
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Trim and validate title and content
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle.length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    if (trimmedContent.length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const { data: post, error: fetchError } = await dbAdmin
      .from('posts')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching post:', fetchError);
      return res.status(404).json({ error: 'Post not found', details: fetchError.message });
    }

    if (!post) {
      console.error('Post not found in database');
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user_id !== user_id) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    // Update the post (using admin client to bypass RLS)
    const { data: updatedPosts, error: updateError } = await dbAdmin
      .from('posts')
      .update({
        title: trimmedTitle,
        content: trimmedContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (updateError) {
     throw updateError;
    }

    if (!updatedPosts || updatedPosts.length === 0) {
      return res.status(404).json({ error: 'Post not found or could not be updated' });
    }

    const updatedPost = updatedPosts[0];
    console.log('✅ Post updated successfully:', { id: updatedPost.id, title: updatedPost.title });

    res.json({
      success: true,
      post: updatedPost,
    });
  } catch (error: any) {
    console.error('Update post error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to update post',
    });
  }
});

// Delete post endpoint
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.headers['x-user-id'] as string;

    console.log('🗑️ DELETE /api/posts/:id called');
    console.log('🗑️ Post ID:', id);
    console.log('🗑️ User ID from header:', user_id);
    console.log('🗑️ All headers:', JSON.stringify(req.headers, null, 2));

    if (!user_id) {
      console.error('❌ No user ID provided');
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('🗑️ Attempting to delete post:', id);
    console.log('🗑️ Using admin client:', !!dbAdmin);

    // First, get the post to check ownership and get image URL (using admin client to bypass RLS)
    console.log('🗑️ Fetching post from database using admin client...');
    const { data: post, error: fetchError } = await dbAdmin
      .from('posts')
      .select('id, user_id, image_url, title')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching post:', fetchError);
      console.error('❌ Error code:', fetchError.code);
      console.error('❌ Error message:', fetchError.message);
      return res.status(404).json({ error: 'Post not found', details: fetchError.message });
    }

    if (!post) {
      console.error('❌ Post not found in database');
      return res.status(404).json({ error: 'Post not found' });
    }

    console.log('✅ Post found:', { id: post.id, user_id: post.user_id, title: post.title });
    console.log('🗑️ Comparing user_id:', { post_user_id: post.user_id, request_user_id: user_id, match: post.user_id === user_id });

    // Check if user owns the post
    if (post.user_id !== user_id) {
      console.error('❌ User does not own this post');
      console.error('❌ Post user_id:', post.user_id);
      console.error('❌ Request user_id:', user_id);
      return res.status(403).json({ 
        error: 'You can only delete your own posts',
        details: `Post belongs to ${post.user_id}, but you are ${user_id}`
      });
    }

    // Delete associated image from storage if it exists
    if (post.image_url) {
      console.log('Deleting associated image:', post.image_url);
      try {
        await deleteImageFromS3(post.image_url);
        console.log('Image deletion completed successfully');
      } catch (error: any) {
        console.error('Failed to delete image from storage:', error);
        console.error('Error message:', error?.message);
        console.error('Error code:', error?.code);
        // Continue with post deletion even if image deletion fails
      }
    }

    // Delete the post from database using admin client to bypass RLS
    // This will automatically cascade delete:
    // - All comments on this post (via ON DELETE CASCADE)
    // - All likes on this post (via ON DELETE CASCADE)
    console.log('🗑️ Deleting post from database using admin client...');
    const { data: deletedData, error: deleteError } = await dbAdmin
      .from('posts')
      .delete()
      .eq('id', id)
      .select();

    if (deleteError) {
      console.error('❌ Database delete error:', deleteError);
      console.error('❌ Error code:', deleteError.code);
      console.error('❌ Error message:', deleteError.message);
      console.error('❌ Error details:', JSON.stringify(deleteError, null, 2));
      throw deleteError;
    }

    console.log('✅ Post deleted from database:', deletedData);
    console.log('✅ Deleted rows:', deletedData?.length || 0);

    // Verify cascading deletes worked (optional - for logging)
    const { count: remainingComments } = await dbAdmin
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id);

    const { count: remainingLikes } = await dbAdmin
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id);

    if (remainingComments && remainingComments > 0) {
      console.warn(`Warning: ${remainingComments} comments still exist for deleted post ${id}`);
    }
    if (remainingLikes && remainingLikes > 0) {
      console.warn(`Warning: ${remainingLikes} likes still exist for deleted post ${id}`);
    }

    console.log('✅✅✅ POST DELETED SUCCESSFULLY:', id);
    console.log('✅ Cascading deletes: Comments and likes should be automatically deleted');
    console.log('✅ Verification: Checking if post still exists...');

    // Double-check that post is actually deleted (using admin client)
    const { data: verifyPost } = await dbAdmin
      .from('posts')
      .select('id')
      .eq('id', id)
      .single();

    if (verifyPost) {
      console.error('❌❌❌ WARNING: Post still exists after deletion!');
      console.error('❌ This should not happen - there may be a database issue');
    } else {
      console.log('✅✅✅ VERIFIED: Post no longer exists in database');
    }

    res.json({
      success: true,
      message: 'Post deleted successfully',
      deletedPostId: id,
      verified: !verifyPost,
    });
  } catch (error: any) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to delete post',
    });
  }
});

// Global error handler (must be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Database test: http://localhost:${PORT}/test-db`);
  console.log(`Signup endpoint: http://localhost:${PORT}/api/signup`);
  console.log(`Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`Create post endpoint: http://localhost:${PORT}/api/posts`);
  console.log(`Delete post endpoint: http://localhost:${PORT}/api/posts/:id`);
});