// Jest setup file - runs before each test file
import { resetMockData } from '../src/config/__mocks__/database';

// Ensure NODE_ENV is set to 'test'
process.env.NODE_ENV = 'test';

// Reset mock data before each test file
beforeAll(() => {
  resetMockData();
});

// Also reset before each test (in case tests modify data)
beforeEach(() => {
  resetMockData();
});
