import type { Config } from 'jest';

const databaseMockPath = '<rootDir>/src/config/__mocks__/database.ts';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  moduleNameMapper: {
    '^\\./config/database$': databaseMockPath,
    '^\\.\\./config/database$': databaseMockPath,
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};

export default config;

