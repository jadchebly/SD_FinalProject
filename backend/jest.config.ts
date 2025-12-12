import type { Config } from 'jest';

const databaseMockPath = '<rootDir>/src/config/__mocks__/database.ts';
const s3ServiceMockPath = '<rootDir>/src/services/__mocks__/s3Service.ts';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  moduleNameMapper: {
    // Map database imports to mock
    '^\\./config/database$': databaseMockPath,
    '^\\.\\./config/database$': databaseMockPath,
    // Map S3 service imports to mock
    '^\\./services/s3Service$': s3ServiceMockPath,
    '^\\.\\./services/s3Service$': s3ServiceMockPath,
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};

export default config;

