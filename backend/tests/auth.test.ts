import request from 'supertest';
import app from '../src/app';
import { mockDataStore, resetMockData } from '../src/config/__mocks__/database';

describe('Auth routes', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('POST /api/signup', () => {
    test('creates a new user successfully', async () => {
      const res = await request(app)
        .post('/api/signup')
        .send({
          username: 'alice',
          email: 'alice@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toMatchObject({
        username: 'alice',
        email: 'alice@example.com',
      });
      expect(res.body.user.id).toBeDefined();

      // Verify user was created in mock store
      expect(mockDataStore.users).toHaveLength(1);
      expect(mockDataStore.users[0].username).toBe('alice');
      expect(mockDataStore.users[0].email).toBe('alice@example.com');
    });

    test('rejects duplicate email', async () => {
      mockDataStore.users.push({
        id: 'user-1',
        username: 'existing',
        email: 'existing@example.com',
        password_hash: 'hash',
      });

      const res = await request(app)
        .post('/api/signup')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email already registered');
      expect(mockDataStore.users).toHaveLength(1);
    });

    test('rejects duplicate username', async () => {
      mockDataStore.users.push({
        id: 'user-1',
        username: 'existing',
        email: 'existing@example.com',
        password_hash: 'hash',
      });

      const res = await request(app)
        .post('/api/signup')
        .send({
          username: 'existing',
          email: 'newemail@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Username already taken');
      expect(mockDataStore.users).toHaveLength(1);
    });

    test('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/signup')
        .send({
          username: 'alice',
          // Missing email and password
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Username, email, and password are required');
    });

    test('rejects password too short', async () => {
      const res = await request(app)
        .post('/api/signup')
        .send({
          username: 'alice',
          email: 'alice@example.com',
          password: '12345', // Less than 6 characters
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password must be at least 6 characters');
    });

    test('trims whitespace from username and email', async () => {
      const res = await request(app)
        .post('/api/signup')
        .send({
          username: '  alice  ',
          email: '  ALICE@EXAMPLE.COM  ',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('alice');
      expect(res.body.user.email).toBe('alice@example.com');
      expect(mockDataStore.users[0].email).toBe('alice@example.com');
    });
  });

  describe('POST /api/login', () => {
    beforeEach(() => {
      mockDataStore.users.push({
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        password_hash: 'correctpassword',
        avatar_url: null,
      });
    });

    test('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'alice@example.com',
          password: 'correctpassword',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toMatchObject({
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
      });
    });

    test('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'alice@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    test('rejects unknown email', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'unknown@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    test('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'alice@example.com',
          // Missing password
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email and password are required');
    });

    test('handles email case insensitivity', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'ALICE@EXAMPLE.COM',
          password: 'correctpassword',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('trims whitespace from email', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: '  alice@example.com  ',
          password: 'correctpassword',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

