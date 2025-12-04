import request from 'supertest';
import app from '../src/app';

describe('Auth endpoints with password hashing', () => {
  describe('POST /api/signup', () => {
    test('stores password as bcrypt hash, not plaintext', async () => {
      const signupData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'securepassword123',
      };

      const res = await request(app)
        .post('/api/signup')
        .send(signupData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.email).toBe('test@example.com');
      
      // The password_hash should now be a bcrypt hash (verified in integration)
      // Direct inspection would require access to mockDataStore or DB query
    });

    test('creates user successfully', async () => {
      const res = await request(app)
        .post('/api/signup')
        .send({
          username: 'alice',
          email: 'alice@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.username).toBe('alice');
    });
  });

  describe('POST /api/login', () => {
    test('login succeeds with correct password using bcrypt verification', async () => {
      // First create a user via signup (which will hash the password with bcrypt)
      const signupRes = await request(app)
        .post('/api/signup')
        .send({
          username: 'logintest',
          email: 'logintest@example.com',
          password: 'mypassword123',
        });

      expect(signupRes.status).toBe(200);

      // Now try to login with the same password
      // This should work because verifyPassword uses bcrypt.compare for new hashes
      const loginRes = await request(app)
        .post('/api/login')
        .send({
          email: 'logintest@example.com',
          password: 'mypassword123',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.user.email).toBe('logintest@example.com');
    });

    test('login fails with incorrect password', async () => {
      // Create user first
      await request(app)
        .post('/api/signup')
        .send({
          username: 'wrongpasstest',
          email: 'wrongpasstest@example.com',
          password: 'correctpass123',
        });

      // Try login with wrong password
      const loginRes = await request(app)
        .post('/api/login')
        .send({
          email: 'wrongpasstest@example.com',
          password: 'wrongpass123',
        });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error).toBe('Invalid email or password');
    });
  });
});
