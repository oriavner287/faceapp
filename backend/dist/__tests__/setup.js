// Test setup file
import { jest } from "@jest/globals";
// Set test timeout to 30 seconds for face detection tests
jest.setTimeout(30000);
// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
