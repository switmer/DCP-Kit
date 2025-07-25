/** @type {import('jest').Config} */
export default {
  transform: {},
  extensionsToTreatAsEsm: ['.jsx', '.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/unit/setup.js'],
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'bin/**/*.js',
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/tests/**'
  ],
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    'json',
    'text',
    'lcov',
    'clover'
  ],
  // Use this option to configure the pattern Jest uses to detect test files.
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  // Add a resolver for custom conditions like 'import' for ESM support with some loaders/packages
  // resolver: undefined, // Or a path to a custom resolver if needed later
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}; 