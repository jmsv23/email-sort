/**
 * Mock Gmail API responses for testing
 */

export const mockGmailMessage = {
  id: 'msg_123abc',
  threadId: 'thread_456def',
  labelIds: ['INBOX', 'UNREAD'],
  snippet: 'This is a preview of the email content...',
  payload: {
    headers: [
      { name: 'Subject', value: 'Weekly Newsletter - Amazing Deals!' },
      { name: 'From', value: 'newsletter@example.com' },
      { name: 'To', value: 'user@test.com' },
      { name: 'Date', value: 'Mon, 1 Jan 2024 10:00:00 +0000' },
      { name: 'List-Unsubscribe', value: '<https://example.com/unsubscribe?email=user@test.com>' },
    ],
    mimeType: 'multipart/alternative',
    body: { size: 0 },
    parts: [
      {
        partId: '0',
        mimeType: 'text/plain',
        body: {
          size: 156,
          data: Buffer.from('Hello! Check out our amazing deals this week. Click here to shop now.').toString('base64'),
        },
      },
      {
        partId: '1',
        mimeType: 'text/html',
        body: {
          size: 324,
          data: Buffer.from('<html><body><h1>Amazing Deals</h1><p>Check out our deals!</p></body></html>').toString('base64'),
        },
      },
    ],
  },
  internalDate: '1704103200000',
  sizeEstimate: 4567,
};

export const mockGmailMessageWithoutUnsubscribe = {
  ...mockGmailMessage,
  payload: {
    ...mockGmailMessage.payload,
    headers: mockGmailMessage.payload.headers.filter(h => h.name !== 'List-Unsubscribe'),
  },
};

export const mockGmailProfile = {
  emailAddress: 'user@test.com',
  messagesTotal: 1234,
  threadsTotal: 567,
  historyId: '789012',
};

export const mockGmailHistoryList = {
  history: [
    {
      id: '789013',
      messages: [
        { id: 'msg_new_1', threadId: 'thread_new_1' },
        { id: 'msg_new_2', threadId: 'thread_new_2' },
      ],
      messagesAdded: [
        {
          message: {
            id: 'msg_new_1',
            threadId: 'thread_new_1',
            labelIds: ['INBOX', 'UNREAD'],
          },
        },
      ],
    },
  ],
  historyId: '789013',
};

export const mockGmailApi = {
  users: {
    getProfile: jest.fn().mockResolvedValue({ data: mockGmailProfile }),
    messages: {
      get: jest.fn().mockResolvedValue({ data: mockGmailMessage }),
      list: jest.fn().mockResolvedValue({
        data: {
          messages: [
            { id: 'msg_1', threadId: 'thread_1' },
            { id: 'msg_2', threadId: 'thread_2' },
          ],
          nextPageToken: null,
          resultSizeEstimate: 2,
        },
      }),
      modify: jest.fn().mockResolvedValue({ data: { id: 'msg_123abc', labelIds: [] } }),
      trash: jest.fn().mockResolvedValue({ data: { id: 'msg_123abc' } }),
      delete: jest.fn().mockResolvedValue({ data: {} }),
    },
    history: {
      list: jest.fn().mockResolvedValue({ data: mockGmailHistoryList }),
    },
  },
};

/**
 * Factory to create mock Gmail client
 */
export const createMockGmailClient = () => ({
  users: {
    getProfile: jest.fn().mockResolvedValue({ data: mockGmailProfile }),
    messages: {
      get: jest.fn().mockResolvedValue({ data: mockGmailMessage }),
      list: jest.fn().mockResolvedValue({
        data: {
          messages: [{ id: 'msg_1', threadId: 'thread_1' }],
          resultSizeEstimate: 1,
        },
      }),
      modify: jest.fn().mockResolvedValue({ data: { id: 'msg_123abc' } }),
      trash: jest.fn().mockResolvedValue({ data: { id: 'msg_123abc' } }),
      delete: jest.fn().mockResolvedValue({ data: {} }),
    },
    history: {
      list: jest.fn().mockResolvedValue({ data: mockGmailHistoryList }),
    },
  },
});

/**
 * Mock google.auth.OAuth2 client
 */
export const createMockOAuth2Client = () => ({
  setCredentials: jest.fn(),
  refreshAccessToken: jest.fn().mockResolvedValue({
    credentials: {
      access_token: 'new-access-token',
      refresh_token: 'refresh-token',
      expiry_date: Date.now() + 3600000,
    },
  }),
  getAccessToken: jest.fn().mockResolvedValue({
    token: 'mock-access-token',
    res: null,
  }),
});
