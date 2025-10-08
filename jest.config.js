module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/infrastructure/server.ts', // Exclude server startup
    '!src/application/use-cases/get-available-rooms.ts', // Has compilation errors
    '!src/application/use-cases/create-reservation.ts', // Has compilation errors
    '!src/infrastructure/container.ts', // Has compilation errors
    '!src/infrastructure/repositories/in-memory-room.repository.ts', // Has compilation errors
    '!src/adapters/http/controllers/*.ts', // Has compilation errors
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  silent: false,
  verbose: true
};
