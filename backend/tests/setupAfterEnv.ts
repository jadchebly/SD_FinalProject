// Jest setup file that runs after test framework is initialized
// This allows us to use Jest globals like beforeEach
import { resetMockData } from '../src/config/__mocks__/database';

beforeEach(() => {
  resetMockData();
});

