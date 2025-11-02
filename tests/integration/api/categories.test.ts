/**
 * Integration tests for Categories API
 * These tests mock the auth and Prisma client
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { GET, POST } from '@/app/api/categories/route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe('Categories API', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockCategories = [
    {
      id: 'cat-1',
      userId: 'user-123',
      name: 'Newsletters',
      description: 'Marketing emails',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { messages: 15 },
    },
    {
      id: 'cat-2',
      userId: 'user-123',
      name: 'Receipts',
      description: 'Purchase receipts',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { messages: 8 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('GET /api/categories', () => {
    it('should return categories for authenticated user', async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCategories);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when session has no user', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: null });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return empty array when user has no categories', async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should handle database errors', async () => {
      (prisma.category.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch categories' });
    });
  });

  describe('POST /api/categories', () => {
    const createMockRequest = (body: any) => {
      return {
        json: async () => body,
      } as NextRequest;
    };

    it('should create a new category', async () => {
      const newCategory = {
        id: 'cat-3',
        userId: 'user-123',
        name: 'Promotions',
        description: 'Sales emails',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { messages: 0 },
      };

      (prisma.category.findUnique as jest.Mock).mockResolvedValue(null); // No duplicate
      (prisma.category.create as jest.Mock).mockResolvedValue(newCategory);

      const request = createMockRequest({
        name: 'Promotions',
        description: 'Sales emails',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(newCategory);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          name: 'Promotions',
          description: 'Sales emails',
        },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });
    });

    it('should trim whitespace from name and description', async () => {
      const newCategory = {
        id: 'cat-3',
        userId: 'user-123',
        name: 'Promotions',
        description: 'Sales emails',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { messages: 0 },
      };

      (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.category.create as jest.Mock).mockResolvedValue(newCategory);

      const request = createMockRequest({
        name: '  Promotions  ',
        description: '  Sales emails  ',
      });

      await POST(request);

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Promotions',
            description: 'Sales emails',
          }),
        })
      );
    });

    it('should allow null description', async () => {
      const newCategory = {
        id: 'cat-3',
        userId: 'user-123',
        name: 'Promotions',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { messages: 0 },
      };

      (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.category.create as jest.Mock).mockResolvedValue(newCategory);

      const request = createMockRequest({ name: 'Promotions' });

      await POST(request);

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: null,
          }),
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({ name: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 when name is missing', async () => {
      const request = createMockRequest({ description: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Category name is required' });
    });

    it('should return 400 when name is empty string', async () => {
      const request = createMockRequest({ name: '' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Category name is required' });
    });

    it('should return 400 when name is only whitespace', async () => {
      const request = createMockRequest({ name: '   ' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Category name is required' });
    });

    it('should return 400 when name is not a string', async () => {
      const request = createMockRequest({ name: 123 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Category name is required' });
    });

    it('should return 409 when category name already exists', async () => {
      const existingCategory = mockCategories[0];
      (prisma.category.findUnique as jest.Mock).mockResolvedValue(existingCategory);

      const request = createMockRequest({ name: 'Newsletters' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data).toEqual({ error: 'A category with this name already exists' });
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('should check for duplicates using trimmed name', async () => {
      const existingCategory = mockCategories[0];
      (prisma.category.findUnique as jest.Mock).mockResolvedValue(existingCategory);

      const request = createMockRequest({ name: '  Newsletters  ' });
      await POST(request);

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: {
          userId_name: {
            userId: 'user-123',
            name: 'Newsletters',
          },
        },
      });
    });

    it('should handle database errors', async () => {
      (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.category.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ name: 'Test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create category' });
    });
  });
});
