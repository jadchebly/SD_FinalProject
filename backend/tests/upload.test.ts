import request from 'supertest';
import app from '../src/app';
import { resetMockData } from '../src/config/__mocks__/database';

describe('Upload routes', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('POST /api/upload', () => {
    test('uploads a valid image file', async () => {
      // Create a mock image buffer (minimal valid PNG)
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/upload')
        .attach('image', pngBuffer, 'test.png')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.url).toBeDefined();
      expect(res.body.path).toBeDefined();
      expect(res.body.url).toContain('mock-storage');
    });

    test('rejects request without file', async () => {
      const res = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(res.body.error).toBe('No file uploaded');
    });

    test('rejects invalid file type', async () => {
      const textBuffer = Buffer.from('This is not an image');

      const res = await request(app)
        .post('/api/upload')
        .attach('image', textBuffer, 'test.txt')
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid file type');
    });

    test('accepts JPEG files', async () => {
      // Minimal JPEG header
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
        0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
        0xff, 0xd9
      ]);

      const res = await request(app)
        .post('/api/upload')
        .attach('image', jpegBuffer, 'test.jpg')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    test('accepts PNG files', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/upload')
        .attach('image', pngBuffer, 'test.png')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    test('accepts GIF files', async () => {
      // Minimal GIF header (GIF89a)
      const gifBuffer = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x0a, 0x00, 0x01,
        0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x00, 0x02, 0x02, 0x04, 0x01, 0x00, 0x3b
      ]);

      const res = await request(app)
        .post('/api/upload')
        .attach('image', gifBuffer, 'test.gif')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    // Note: Testing file size limit would require mocking multer's size limit
    // The actual validation happens in uploadService, but multer might reject first
    // For a comprehensive test, we'd need to mock multer or configure it differently in tests
  });
});

