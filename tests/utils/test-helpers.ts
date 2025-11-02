import { User, Account, Category, Message } from '@prisma/client';

/**
 * Factory functions to create mock Prisma models for testing
 */

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: new Date(),
  image: null,
  createdAt: new Date(),
  ...overrides,
});

export const createMockAccount = (overrides?: Partial<Account>): Account => ({
  id: 'account-123',
  userId: 'user-123',
  type: 'oauth',
  provider: 'google',
  providerAccountId: 'google-123',
  refresh_token: 'encrypted-refresh-token',
  access_token: 'encrypted-access-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'Bearer',
  scope: 'https://www.googleapis.com/auth/gmail.modify',
  id_token: null,
  session_state: null,
  history_id: '12345',
  createdAt: new Date(),
  ...overrides,
});

export const createMockCategory = (overrides?: Partial<Category>): Category => ({
  id: 'category-123',
  userId: 'user-123',
  name: 'Newsletters',
  description: 'Marketing emails and newsletters',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockMessage = (overrides?: Partial<Message>): Message => ({
  id: 'message-123',
  accountId: 'account-123',
  gmailMessageId: 'gmail-msg-123',
  threadId: 'thread-123',
  categoryId: 'category-123',
  subject: 'Test Email Subject',
  from: 'sender@example.com',
  to: 'recipient@example.com',
  snippet: 'This is a test email snippet...',
  bodyText: 'This is the full email body text.',
  bodyHtml: '<p>This is the full email body HTML.</p>',
  aiSummary: 'AI-generated summary of the email.',
  aiClassification: { categoryId: 'category-123', confidence: 0.95, reason: 'Newsletter content detected' },
  importedAt: new Date(),
  archived: false,
  unsubscribed: false,
  unsubscribeLink: 'https://example.com/unsubscribe',
  ...overrides,
});

/**
 * Helper to create multiple mock messages
 */
export const createMockMessages = (count: number, baseOverrides?: Partial<Message>): Message[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      id: `message-${i + 1}`,
      gmailMessageId: `gmail-msg-${i + 1}`,
      subject: `Test Email ${i + 1}`,
      ...baseOverrides,
    })
  );
};

/**
 * Helper to wait for async operations in tests
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock Gmail API message response
 */
export const createMockGmailMessage = (overrides?: any) => ({
  id: 'gmail-msg-123',
  threadId: 'thread-123',
  labelIds: ['INBOX', 'UNREAD'],
  snippet: 'This is a test email snippet...',
  payload: {
    headers: [
      { name: 'Subject', value: 'Test Email Subject' },
      { name: 'From', value: 'sender@example.com' },
      { name: 'To', value: 'recipient@example.com' },
      { name: 'Date', value: new Date().toUTCString() },
      { name: 'List-Unsubscribe', value: '<https://example.com/unsubscribe>' },
    ],
    body: {
      data: Buffer.from('This is the email body').toString('base64'),
    },
    parts: [
      {
        mimeType: 'text/plain',
        body: {
          data: Buffer.from('This is plain text body').toString('base64'),
        },
      },
      {
        mimeType: 'text/html',
        body: {
          data: Buffer.from('<p>This is HTML body</p>').toString('base64'),
        },
      },
    ],
  },
  internalDate: Date.now().toString(),
  ...overrides,
});

/**
 * Mock session for NextAuth
 */
export const createMockSession = (overrides?: any) => ({
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});
