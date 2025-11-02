/**
 * Unit tests for Gmail API integration library
 * These tests mock the googleapis library and Prisma client
 */

import { getGmailClient, fetchGmailMessage, archiveGmailMessage, trashGmailMessage } from '@/lib/gmail';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import * as encryption from '@/lib/encryption';

// Mock dependencies
jest.mock('googleapis');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/encryption');

describe('Gmail Library', () => {
  const mockProvider = 'google';
  const mockProviderAccountId = 'account-123';

  const mockAccount = {
    id: 'acc-1',
    userId: 'user-1',
    provider: 'google',
    providerAccountId: 'account-123',
    access_token: 'encrypted-access-token',
    refresh_token: 'encrypted-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    id_token: null,
    session_state: null,
    history_id: '12345',
    createdAt: new Date(),
    type: 'oauth',
  };

  const mockOAuth2Client = {
    setCredentials: jest.fn(),
    on: jest.fn(),
  };

  const mockGmailClient = {
    users: {
      messages: {
        get: jest.fn(),
        modify: jest.fn(),
        trash: jest.fn(),
      },
      getProfile: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock encryption functions
    (encryption.decrypt as jest.Mock).mockImplementation((val: string) => `decrypted-${val}`);
    (encryption.encrypt as jest.Mock).mockImplementation((val: string) => `encrypted-${val}`);

    // Mock googleapis
    (google.auth.OAuth2 as unknown as jest.Mock).mockReturnValue(mockOAuth2Client);
    (google.gmail as jest.Mock).mockReturnValue(mockGmailClient);

    // Mock prisma findUnique to return account
    (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);
  });

  describe('getGmailClient', () => {
    it('should fetch account from database', async () => {
      await getGmailClient(mockProvider, mockProviderAccountId);

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerAccountId: {
            provider: mockProvider,
            providerAccountId: mockProviderAccountId,
          },
        },
      });
    });

    it('should throw error if account not found', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        getGmailClient(mockProvider, mockProviderAccountId)
      ).rejects.toThrow('Account not found or not authenticated');
    });

    it('should throw error if access_token is missing', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        ...mockAccount,
        access_token: null,
      });

      await expect(
        getGmailClient(mockProvider, mockProviderAccountId)
      ).rejects.toThrow('Account not found or not authenticated');
    });

    it('should decrypt tokens before setting credentials', async () => {
      await getGmailClient(mockProvider, mockProviderAccountId);

      expect(encryption.decrypt).toHaveBeenCalledWith(mockAccount.access_token);
      expect(encryption.decrypt).toHaveBeenCalledWith(mockAccount.refresh_token);

      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: 'decrypted-encrypted-access-token',
        refresh_token: 'decrypted-encrypted-refresh-token',
      });
    });

    it('should handle missing refresh token', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        ...mockAccount,
        refresh_token: null,
      });

      await getGmailClient(mockProvider, mockProviderAccountId);

      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: expect.any(String),
        refresh_token: undefined,
      });
    });

    it('should return authenticated Gmail client', async () => {
      const client = await getGmailClient(mockProvider, mockProviderAccountId);

      expect(google.gmail).toHaveBeenCalledWith({
        version: 'v1',
        auth: mockOAuth2Client,
      });
      expect(client).toBe(mockGmailClient);
    });

    it('should set up token refresh handler', async () => {
      await getGmailClient(mockProvider, mockProviderAccountId);

      expect(mockOAuth2Client.on).toHaveBeenCalledWith('tokens', expect.any(Function));
    });
  });

  describe('fetchGmailMessage', () => {
    const mockMessageId = 'msg-123';
    const mockMessageData = {
      id: mockMessageId,
      threadId: 'thread-123',
      labelIds: ['INBOX'],
      snippet: 'Test message',
      payload: {
        headers: [
          { name: 'Subject', value: 'Test Subject' },
          { name: 'From', value: 'sender@example.com' },
        ],
      },
    };

    beforeEach(() => {
      mockGmailClient.users.messages.get.mockResolvedValue({ data: mockMessageData });
    });

    it('should fetch message with correct parameters', async () => {
      await fetchGmailMessage(mockProvider, mockProviderAccountId, mockMessageId);

      expect(mockGmailClient.users.messages.get).toHaveBeenCalledWith({
        userId: 'me',
        id: mockMessageId,
        format: 'full',
      });
    });

    it('should return message data', async () => {
      const result = await fetchGmailMessage(mockProvider, mockProviderAccountId, mockMessageId);

      expect(result).toEqual(mockMessageData);
    });
  });

  describe('archiveGmailMessage', () => {
    const mockMessageId = 'msg-123';

    beforeEach(() => {
      mockGmailClient.users.messages.modify.mockResolvedValue({});
    });

    it('should call modify with correct parameters to remove INBOX label', async () => {
      await archiveGmailMessage(mockProvider, mockProviderAccountId, mockMessageId);

      expect(mockGmailClient.users.messages.modify).toHaveBeenCalledWith({
        userId: 'me',
        id: mockMessageId,
        requestBody: {
          removeLabelIds: ['INBOX'],
        },
      });
    });
  });

  describe('trashGmailMessage', () => {
    const mockMessageId = 'msg-123';

    beforeEach(() => {
      mockGmailClient.users.messages.trash.mockResolvedValue({});
    });

    it('should call trash with correct parameters', async () => {
      await trashGmailMessage(mockProvider, mockProviderAccountId, mockMessageId);

      expect(mockGmailClient.users.messages.trash).toHaveBeenCalledWith({
        userId: 'me',
        id: mockMessageId,
      });
    });
  });

  describe('Token refresh handling', () => {
    it('should update database with new encrypted tokens on refresh', async () => {
      await getGmailClient(mockProvider, mockProviderAccountId);

      // Get the token refresh callback
      const tokenCallback = mockOAuth2Client.on.mock.calls.find(
        call => call[0] === 'tokens'
      )?.[1];

      expect(tokenCallback).toBeDefined();

      // Simulate token refresh
      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      await tokenCallback(newTokens);

      expect(encryption.encrypt).toHaveBeenCalledWith('new-access-token');
      expect(encryption.encrypt).toHaveBeenCalledWith('new-refresh-token');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: {
          provider_providerAccountId: {
            provider: mockProvider,
            providerAccountId: mockProviderAccountId,
          },
        },
        data: {
          access_token: 'encrypted-new-access-token',
          refresh_token: 'encrypted-new-refresh-token',
          expires_at: expect.any(Number),
        },
      });
    });
  });
});
