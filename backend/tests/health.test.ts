import request from 'supertest';
import app from '../src/app';
import { mockDataStore, resetMockData } from '../src/config/__mocks__/database';

describe('Health and diagnostics routes', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('GET /health', () => {
    test('returns health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        message: 'Backend is running!',
      });
    });
  });

  describe('GET /test-db', () => {
    test('returns success when database is accessible', async () => {
      // Mock has users table accessible
      const res = await request(app).get('/test-db');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.database).toBe('connected');
      expect(res.body.message).toBeDefined();
    });

    test('handles empty result gracefully', async () => {
      // With empty store, should still return success
      const res = await request(app).get('/test-db');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns connection status when tables exist', async () => {
      // Add a user to simulate existing data
      mockDataStore.users.push({
        id: 'test-user',
        username: 'test',
        email: 'test@example.com',
      });

      const res = await request(app).get('/test-db');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.database).toBe('connected');
    });
  });
});

