import request from 'supertest';
import app from '../src/app';
import { mockDataStore, resetMockData } from '../src/config/__mocks__/database';

const alice = {
  id: 'user-alice',
  username: 'alice',
  email: 'alice@example.com',
  avatar_url: null,
};

const bob = {
  id: 'user-bob',
  username: 'bob',
  email: 'bob@example.com',
  avatar_url: null,
};

const charlie = {
  id: 'user-charlie',
  username: 'charlie',
  email: 'charlie@example.com',
  avatar_url: null,
};

const dave = {
  id: 'user-dave',
  username: 'dave',
  email: 'dave@example.com',
  avatar_url: null,
};

describe('Follow routes', () => {
  beforeEach(() => {
    resetMockData();
    mockDataStore.users.push({ ...alice }, { ...bob }, { ...charlie }, { ...dave });
  });

  describe('POST /api/follow/:userId', () => {
    test('follows a user successfully', async () => {
      const res = await request(app)
        .post('/api/follow/user-bob')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDataStore.follows).toHaveLength(1);
      expect(mockDataStore.follows[0]).toEqual({
        follower_id: alice.id,
        following_id: bob.id,
      });
    });

    test('rejects trying to follow yourself', async () => {
      const res = await request(app)
        .post('/api/follow/user-alice')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot follow yourself');
      expect(mockDataStore.follows).toHaveLength(0);
    });

    test('rejects duplicate follow', async () => {
      mockDataStore.follows.push({
        follower_id: alice.id,
        following_id: bob.id,
      });

      const res = await request(app)
        .post('/api/follow/user-bob')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Already following this user');
      expect(mockDataStore.follows).toHaveLength(1);
    });

    test('rejects missing authentication header', async () => {
      const res = await request(app).post('/api/follow/user-bob');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });
  });

  describe('DELETE /api/follow/:userId', () => {
    beforeEach(() => {
      mockDataStore.follows.push({
        follower_id: alice.id,
        following_id: bob.id,
      });
    });

    test('unfollows a user successfully', async () => {
      const res = await request(app)
        .delete('/api/follow/user-bob')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDataStore.follows).toHaveLength(0);
    });

    test('unfollowing when not following still succeeds', async () => {
      mockDataStore.follows = [];

      const res = await request(app)
        .delete('/api/follow/user-bob')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('rejects missing authentication header', async () => {
      const res = await request(app).delete('/api/follow/user-bob');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });
  });

  describe('GET /api/users/suggested', () => {
    test('returns users not followed by current user', async () => {
      mockDataStore.follows.push({
        follower_id: alice.id,
        following_id: bob.id,
      });

      const res = await request(app)
        .get('/api/users/suggested')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const suggestedUserIds = res.body.users.map((u: any) => u.id);
      expect(suggestedUserIds).not.toContain(alice.id); // Should not include self
      expect(suggestedUserIds).not.toContain(bob.id); // Should not include followed user
      expect(suggestedUserIds.length).toBeLessThanOrEqual(5);
    });

    test('does not include current user in suggestions', async () => {
      const res = await request(app)
        .get('/api/users/suggested')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      const suggestedUserIds = res.body.users.map((u: any) => u.id);
      expect(suggestedUserIds).not.toContain(alice.id);
    });

    test('returns at most 5 suggestions', async () => {
      // Add many users
      for (let i = 0; i < 10; i++) {
        mockDataStore.users.push({
          id: `user-${i}`,
          username: `user${i}`,
          email: `user${i}@example.com`,
          avatar_url: null,
        });
      }

      const res = await request(app)
        .get('/api/users/suggested')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeLessThanOrEqual(5);
    });

    test('works without authentication (optional)', async () => {
      // Note: The first /api/users/suggested route (line 346) doesn't require auth
      // It's optional - if no x-user-id, it just returns suggestions for anonymous user
      const res = await request(app).get('/api/users/suggested');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/users/search/:query', () => {
    test('returns matching users by username', async () => {
      const res = await request(app)
        .get('/api/users/search/bob')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(res.body.users[0].username).toContain('bob');
    });

    test('case-insensitive search', async () => {
      const res = await request(app)
        .get('/api/users/search/BOB')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.users.some((u: any) => u.username === 'bob')).toBe(true);
    });

    test('allows single character queries', async () => {
      // The route checks for length < 1, so single characters are allowed
      const res = await request(app)
        .get('/api/users/search/b')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // May return results if any username contains 'b'
    });

    test('includes follow status in results', async () => {
      mockDataStore.follows.push({
        follower_id: alice.id,
        following_id: bob.id,
      });

      const res = await request(app)
        .get('/api/users/search/bob')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      const bobResult = res.body.users.find((u: any) => u.id === bob.id);
      expect(bobResult).toBeDefined();
      expect(bobResult.isFollowing).toBe(true);
    });

    test('limits results to 10 users', async () => {
      // Add many users with similar usernames
      for (let i = 0; i < 15; i++) {
        mockDataStore.users.push({
          id: `user-test${i}`,
          username: `testuser${i}`,
          email: `test${i}@example.com`,
          avatar_url: null,
        });
      }

      const res = await request(app)
        .get('/api/users/search/test')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/users/:id', () => {
    test('returns user profile with follower/following counts', async () => {
      mockDataStore.follows.push(
        { follower_id: bob.id, following_id: alice.id },
        { follower_id: charlie.id, following_id: alice.id },
        { follower_id: alice.id, following_id: bob.id }
      );

      const res = await request(app)
        .get(`/api/users/${alice.id}`)
        .set('x-user-id', bob.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.id).toBe(alice.id);
      expect(res.body.user.followerCount).toBe(2);
      expect(res.body.user.followingCount).toBe(1);
    });

    test('returns isFollowing status', async () => {
      mockDataStore.follows.push({
        follower_id: bob.id,
        following_id: alice.id,
      });

      const res = await request(app)
        .get(`/api/users/${alice.id}`)
        .set('x-user-id', bob.id);

      expect(res.status).toBe(200);
      expect(res.body.user.isFollowing).toBe(true);
    });

    test('returns false for isFollowing when not following', async () => {
      const res = await request(app)
        .get(`/api/users/${alice.id}`)
        .set('x-user-id', bob.id);

      expect(res.status).toBe(200);
      expect(res.body.user.isFollowing).toBe(false);
    });

    test('returns 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/nonexistent')
        .set('x-user-id', alice.id);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });
  });
});

