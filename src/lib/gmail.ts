import { google } from 'googleapis';
import { prisma } from './prisma';
import { decrypt, encrypt } from './encryption';

/**
 * Get authenticated Gmail client for a user account
 */
export async function getGmailClient(provider: string, providerAccountId: string) {
  const account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: provider,
        providerAccountId: providerAccountId,
      },
    },
  });

  if (!account || !account.access_token) {
    throw new Error('Account not found or not authenticated');
  }

  // Decrypt tokens
  const decryptedAccessToken = decrypt(account.access_token);
  const decryptedRefreshToken = account.refresh_token ? decrypt(account.refresh_token) : undefined;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: decryptedAccessToken,
    refresh_token: decryptedRefreshToken,
  });

  // Handle token refresh - encrypt new tokens before storing
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: {
          provider_providerAccountId: {
            provider: provider,
            providerAccountId: providerAccountId,
          },
        },
        data: {
          access_token: encrypt(tokens.access_token),
          refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : account.refresh_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
        },
      });
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Fetch a message from Gmail
 */
export async function fetchGmailMessage(provider: string, providerAccountId: string, messageId: string) {
  const gmail = await getGmailClient(provider, providerAccountId);
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
export async function archiveGmailMessage(provider: string, providerAccountId: string, messageId: string) {
  const gmail = await getGmailClient(provider, providerAccountId);
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
export async function trashGmailMessage(provider: string, providerAccountId: string, messageId: string) {
  const gmail = await getGmailClient(provider, providerAccountId);
  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
}

/**
 * Get user's Gmail profile
 */
export async function getGmailProfile(provider: string, providerAccountId: string) {
  const gmail = await getGmailClient(provider, providerAccountId);
  const response = await gmail.users.getProfile({
    userId: 'me',
  });
  return response.data;
}

/**
 * List history of changes since a historyId
 */
export async function listGmailHistory(provider: string, providerAccountId: string, startHistoryId: string) {
  const gmail = await getGmailClient(provider, providerAccountId);
  const response = await gmail.users.history.list({
    userId: 'me',
    startHistoryId,
    historyTypes: ['messageAdded'],
  });
  return response.data;
}
