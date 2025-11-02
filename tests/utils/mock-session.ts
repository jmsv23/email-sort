import { Session } from 'next-auth';

/**
 * Mock NextAuth session utilities for testing
 */

export const mockSession: Session = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const mockSessionWithDifferentUser: Session = {
  user: {
    id: 'user-456',
    email: 'another@example.com',
    name: 'Another User',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * Mock getServerSession to return a test session
 * Usage in tests:
 *
 * jest.mock('next-auth/next', () => ({
 *   getServerSession: jest.fn(() => Promise.resolve(mockSession)),
 * }));
 */
export const getMockServerSession = () => Promise.resolve(mockSession);

/**
 * Mock useSession hook for client components
 * Usage in tests:
 *
 * jest.mock('next-auth/react', () => ({
 *   useSession: jest.fn(() => ({
 *     data: mockSession,
 *     status: 'authenticated',
 *   })),
 * }));
 */
export const mockUseSession = {
  data: mockSession,
  status: 'authenticated' as const,
  update: jest.fn(),
};

export const mockUseSessionUnauthenticated = {
  data: null,
  status: 'unauthenticated' as const,
  update: jest.fn(),
};

export const mockUseSessionLoading = {
  data: null,
  status: 'loading' as const,
  update: jest.fn(),
};
