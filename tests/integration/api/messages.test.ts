/**
 * Integration tests for Messages API
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    message: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { GET } from '@/app/api/messages/route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('Messages API', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  const mockMessages = [
    {
      id: 'msg-1',
      subject: 'Test Email 1',
      from: 'sender1@example.com',
      to: 'user@test.com',
      snippet: 'Email preview',
      aiSummary: 'AI summary',
      category: { id: 'cat-1', name: 'Newsletters' },
      account: {
        provider: 'google',
        providerAccountId: 'account-1',
        profile_id: 'user@test.com',
      },
      importedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('GET /api/messages', () => {
    it('should return paginated messages', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);
      (prisma.message.count as jest.Mock).mockResolvedValue(1);

      const request = new Request('http://localhost/api/messages?page=1&limit=50');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toEqual(mockMessages);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 50,
        totalCount: 1,
        totalPages: 1,
      });
    });

    it('should filter by categoryId', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);
      (prisma.message.count as jest.Mock).mockResolvedValue(1);

      const request = new Request('http://localhost/api/messages?categoryId=cat-1');
      await GET(request as any);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-1',
          }),
        })
      );
    });

    it('should filter by accountId', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);
      (prisma.message.count as jest.Mock).mockResolvedValue(1);

      const request = new Request('http://localhost/api/messages?accountId=account-1');
      await GET(request as any);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account-1',
          }),
        })
      );
    });

    it('should filter uncategorized messages', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.count as jest.Mock).mockResolvedValue(0);

      const request = new Request('http://localhost/api/messages?categoryId=uncategorized');
      await GET(request as any);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: null,
          }),
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/messages');
      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should handle pagination correctly', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);
      (prisma.message.count as jest.Mock).mockResolvedValue(150);

      const request = new Request('http://localhost/api/messages?page=2&limit=50');
      const response = await GET(request as any);
      const data = await response.json();

      expect(data.pagination).toEqual({
        page: 2,
        limit: 50,
        totalCount: 150,
        totalPages: 3,
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50, // (page-1) * limit
          take: 50,
        })
      );
    });

    it('should only return non-archived messages', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);
      (prisma.message.count as jest.Mock).mockResolvedValue(1);

      const request = new Request('http://localhost/api/messages');
      await GET(request as any);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            archived: false,
          }),
        })
      );
    });
  });
});
