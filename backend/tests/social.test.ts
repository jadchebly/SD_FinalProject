import request from 'supertest';
import app from '../src/app';
import { mockDataStore, resetMockData } from '../src/config/__mocks__/database';

const alice = {
  id: 'user-alice',
  username: 'alice',
  email: 'alice@example.com',
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
};

const bob = {
  id: 'user-bob',
  username: 'bob',
  email: 'bob@example.com',
  avatar_url: null,
  created_at: '2024-01-02T00:00:00Z',
};

const charlie = {
  id: 'user-charlie',
  username: 'charlie',
  email: 'charlie@example.com',
  avatar_url: null,
  created_at: '2024-01-03T00:00:00Z',
};

const seedBaseData = () => {
  mockDataStore.users.push({ ...alice }, { ...bob }, { ...charlie });

  mockDataStore.posts.push(
    {
      id: 'post-alice',
      user_id: alice.id,
      title: 'Alice Post',
      content: 'hello from alice',
      type: 'text',
      created_at: '2024-06-01T10:00:00Z',
      image_url: null,
      video_url: null,
    },
    {
      id: 'post-bob',
      user_id: bob.id,
      title: 'Bob Post',
      content: 'bob update',
      type: 'text',
      created_at: '2024-06-02T10:00:00Z',
      image_url: null,
      video_url: null,
    },
    {
      id: 'post-charlie',
      user_id: charlie.id,
      title: 'Charlie Post',
      content: 'charlie news',
      type: 'text',
      created_at: '2024-06-03T10:00:00Z',
      image_url: null,
      video_url: null,
    }
  );

  mockDataStore.follows.push({
    follower_id: alice.id,
    following_id: bob.id,
  });
};

describe('Social routes', () => {
  beforeEach(() => {
    resetMockData();
    seedBaseData();
  });

  describe('Likes endpoints', () => {
    test('creates a like when header and entities exist', async () => {
      await request(app)
        .post('/api/posts/post-bob/like')
        .set('x-user-id', alice.id)
        .expect(200)
        .expect(res => {
          expect(res.body).toMatchObject({ success: true });
        });

      expect(mockDataStore.likes).toHaveLength(1);
      expect(mockDataStore.likes[0]).toEqual({ user_id: alice.id, post_id: 'post-bob' });
    });

    test('liking twice is idempotent', async () => {
      await request(app).post('/api/posts/post-bob/like').set('x-user-id', alice.id);
      const res = await request(app).post('/api/posts/post-bob/like').set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Already liked');
      expect(mockDataStore.likes).toHaveLength(1);
    });

    test('liking without authentication fails', async () => {
      const res = await request(app).post('/api/posts/post-bob/like');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
      expect(mockDataStore.likes).toHaveLength(0);
    });

    test('unliking removes an existing like', async () => {
      mockDataStore.likes.push({ user_id: alice.id, post_id: 'post-bob' });

      await request(app)
        .delete('/api/posts/post-bob/like')
        .set('x-user-id', alice.id)
        .expect(200);

      expect(mockDataStore.likes).toHaveLength(0);
    });

    test('unliking a post without a like still succeeds', async () => {
      const res = await request(app)
        .delete('/api/posts/post-bob/like')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDataStore.likes).toHaveLength(0);
    });
  });

  describe('Comments endpoints', () => {
    test('creates a comment with valid payload', async () => {
      const commentText = 'Nice post!';

      const res = await request(app)
        .post('/api/posts/post-bob/comments')
        .set('x-user-id', alice.id)
        .send({ text: commentText });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.comment).toMatchObject({
        text: commentText,
        user: alice.username,
      });
      expect(mockDataStore.comments).toHaveLength(1);
      expect(mockDataStore.comments[0]).toMatchObject({
        text: commentText,
        user_id: alice.id,
        post_id: 'post-bob',
      });
    });

    test('rejects empty or whitespace-only comments', async () => {
      const res = await request(app)
        .post('/api/posts/post-bob/comments')
        .set('x-user-id', alice.id)
        .send({ text: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Comment text is required');
      expect(mockDataStore.comments).toHaveLength(0);
    });

    test('lists comments in chronological order', async () => {
      mockDataStore.comments.push(
        {
          id: 'comment-1',
          post_id: 'post-bob',
          user_id: alice.id,
          text: 'First!',
          created_at: '2024-06-05T10:00:00Z',
        },
        {
          id: 'comment-2',
          post_id: 'post-bob',
          user_id: bob.id,
          text: 'Thanks!',
          created_at: '2024-06-05T12:00:00Z',
        }
      );

      const res = await request(app).get('/api/posts/post-bob/comments');

      expect(res.status).toBe(200);
      expect(res.body.comments).toHaveLength(2);
      expect(res.body.comments[0].text).toBe('First!');
      expect(res.body.comments[1].text).toBe('Thanks!');
    });
  });

  describe('Feed endpoint', () => {
    test('requires authentication header', async () => {
      const res = await request(app).get('/api/feed');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    test('returns posts from self and followed users only', async () => {
      mockDataStore.likes.push({ user_id: alice.id, post_id: 'post-bob' });
      mockDataStore.comments.push({
        id: 'comment-feed',
        post_id: 'post-bob',
        user_id: alice.id,
        text: 'feed comment',
        created_at: '2024-06-05T15:00:00Z',
      });

      const res = await request(app).get('/api/feed').set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const posts = res.body.posts;
      expect(posts).toHaveLength(2);
      expect(posts.map((p: any) => p.id)).toEqual(['post-bob', 'post-alice']);

      const bobPost = posts[0];
      expect(bobPost.user).toBe(bob.username);
      expect(bobPost.likes).toBe(1);
      expect(bobPost.likers).toEqual([alice.id]);
      expect(bobPost.commentsCount).toBe(1);
      expect(bobPost.hasLiked).toBe(true);

      const alicePost = posts[1];
      expect(alicePost.user).toBe(alice.username);
      expect(alicePost.hasLiked).toBe(false);

      expect(posts.find((p: any) => p.id === 'post-charlie')).toBeUndefined();
    });
  });
});

