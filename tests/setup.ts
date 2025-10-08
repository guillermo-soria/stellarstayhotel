// Test setup file for global configurations
import { logger } from '../src/infrastructure/logger';

// Silence logger during tests
logger.level = 'silent';

// Global test timeout
jest.setTimeout(10000);

// Keep console.log for debugging but silence others
global.console = {
  ...console,
  log: console.log, // Keep log for debugging
  debug: jest.fn(),
  info: jest.fn(), 
  warn: jest.fn(),
  error: jest.fn(),
};
