module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/playwright-report/', '<rootDir>/test-results/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^server-only$': '<rootDir>/test/__mocks__/server-only.ts',
    // jose v6 is ESM-only and cannot be required by the CJS Jest runtime.
    '^jose$': '<rootDir>/test/__mocks__/jose.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
