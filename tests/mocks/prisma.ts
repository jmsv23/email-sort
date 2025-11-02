/**
 * Mock Prisma client for testing
 * This creates a mock with all common Prisma operations
 */

// Create a mock Prisma client
export const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  category: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  message: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock the Prisma client module
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: prismaMock,
}));

export default prismaMock;
