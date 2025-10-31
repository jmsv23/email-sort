import { google } from 'googleapis';
import { prisma } from './prisma';

/**
 * Get authenticated Gmail client for a user account
 */
export async function getGmailClient(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account || !account.accessToken) {
    throw new Error('Account not found or not authenticated');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken || undefined,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: accountId },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || account.refreshToken,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Fetch a message from Gmail
 */
export async function fetchGmailMessage(accountId: string, messageId: string) {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  return response.data;
}

/**
 * Archive a message in Gmail (remove INBOX label)
 */
export async function archiveGmailMessage(accountId: string, messageId: string) {
  const gmail = await getGmailClient(accountId);
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['INBOX'],
    },
  });
}

/**
 * Trash a message in Gmail
 */
export async function trashGmailMessage(accountId: string, messageId: string) {
  const gmail = await getGmailClient(accountId);
  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
}

/**
 * Get user's Gmail profile
 */
export async function getGmailProfile(accountId: string) {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.getProfile({
    userId: 'me',
  });
  return response.data;
}

/**
 * List history of changes since a historyId
 */
export async function listGmailHistory(accountId: string, startHistoryId: string) {
  const gmail = await getGmailClient(accountId);
  const response = await gmail.users.history.list({
    userId: 'me',
    startHistoryId,
    historyTypes: ['messageAdded'],
  });
  return response.data;
}
