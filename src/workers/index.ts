import { Worker } from 'bullmq';
import { connection } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { fetchGmailMessage, archiveGmailMessage } from '@/lib/gmail';
import { getAIClient } from '@/ai/aiClient';
import { startPolling } from './poller';
import TurndownService from 'turndown';

/**
 * Extract text and HTML body from Gmail message payload
 * Handles both single-part and multipart messages (recursive)
 */
function extractEmailBodies(payload: any): { bodyText: string; bodyHtml: string | null } {
  let bodyText = '';
  let bodyHtml: string | null = null;

  // Helper to decode base64url data (Gmail uses URL-safe base64)
  function decodeBody(data: string): string {
    if (!data) return '';
    // Replace URL-safe characters with standard base64
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  // Helper to recursively extract parts from MIME structure
  function extractParts(part: any) {
    const mimeType = part.mimeType;

    // If this part has body data, decode it
    if (part.body?.data) {
      const decoded = decodeBody(part.body.data);

      // Extract text/plain for bodyText (first match wins)
      if (mimeType === 'text/plain' && !bodyText) {
        bodyText = decoded;
      }
      // Extract text/html for bodyHtml (first match wins)
      else if (mimeType === 'text/html' && !bodyHtml) {
        bodyHtml = decoded;
      }
    }

    // Recursively process nested parts (for multipart messages)
    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        extractParts(subPart);
      }
    }
  }

  // Start extraction from the payload root
  if (payload) {
    extractParts(payload);
  }

  return { bodyText, bodyHtml };
}

/**
 * Worker: Process new Gmail message
 */
export const processNewMessageWorker = new Worker(
  'processNewMessage',
  async (job) => {
    const { provider, providerAccountId, gmailMessageId } = job.data;

    console.log(`Processing message ${gmailMessageId} for account ${provider}:${providerAccountId}`);

    // Fetch message from Gmail
    const gmailMessage = await fetchGmailMessage(provider, providerAccountId, gmailMessageId);

    // Extract message data
    const headers = gmailMessage.payload?.headers || [];
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const to = headers.find((h) => h.name === 'To')?.value || '';

    // Extract List-Unsubscribe header
    const listUnsubscribeHeader = headers.find((h) => h.name?.toLowerCase() === 'list-unsubscribe')?.value || null;

    // Parse List-Unsubscribe header to extract HTTP/HTTPS URL
    let unsubscribeLink: string | null = null;
    if (listUnsubscribeHeader) {
      // List-Unsubscribe can contain multiple values like: <url>, <mailto:...>
      // Extract HTTP/HTTPS URLs (ignore mailto links)
      const urlMatches = listUnsubscribeHeader.match(/https?:\/\/[^\s,>]+/gi);
      if (urlMatches && urlMatches.length > 0) {
        unsubscribeLink = urlMatches[0];
      }
    }

    // Extract email bodies (text and HTML) from payload
    const { bodyText, bodyHtml } = extractEmailBodies(gmailMessage.payload);

    // Convert HTML to markdown if HTML body exists
    let bodyMarkdownVersion: string | undefined = undefined;
    if (bodyHtml) {
      try {
        const turndownService = new TurndownService();
        bodyMarkdownVersion = turndownService.turndown(bodyHtml);
      } catch (error) {
        console.error('Failed to convert HTML to markdown:', error);
        // Continue without markdown version
      }
    }

    // Get user categories
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: { user: { include: { categories: true } } },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Classify, summarize, and extract unsubscribe link with AI (single call)
    const aiClient = getAIClient();

    const aiAnalysis = await aiClient.classifyEmail({
      subject,
      from,
      bodyTextVersion: bodyText,
      bodyMarkdownVersion,
      categories: account.user.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
      })),
    });

    // Use AI-extracted unsubscribe link as fallback if header didn't contain one
    if (!unsubscribeLink && aiAnalysis.unsubscribeLink) {
      unsubscribeLink = aiAnalysis.unsubscribeLink;
    }

    // Store message in database
    await prisma.message.create({
      data: {
        provider,
        providerAccountId,
        gmailMessageId,
        threadId: gmailMessage.threadId || null,
        categoryId: aiAnalysis.categoryId || null,
        subject,
        from,
        to,
        snippet: gmailMessage.snippet || null,
        bodyText,
        bodyHtml,
        aiSummary: aiAnalysis.summary,
        aiClassification: aiAnalysis as any,
        listUnsubscribeHeader,
        unsubscribeLink,
        archived: false,
        unsubscribed: false,
      },
    });

    // Archive message in Gmail (remove from INBOX)
    await archiveGmailMessage(provider, providerAccountId, gmailMessageId);

    console.log(`Message ${gmailMessageId} processed successfully`);
  },
  { connection }
);

/**
 * Worker: Unsubscribe from email
 * TODO: Implement Playwright-based unsubscribe automation
 */
export const unsubscribeWorker = new Worker(
  'unsubscribe',
  async (job) => {
    const { messageId, userId } = job.data;

    console.log(`Unsubscribe job for message ${messageId}`);

    // TODO: Implement unsubscribe logic
    // 1. Extract unsubscribe link from message
    // 2. Launch Playwright browser
    // 3. Navigate and detect/fill forms
    // 4. Mark message as unsubscribed

    console.log('Unsubscribe worker not yet implemented');
  },
  { connection }
);

console.log('Workers initialized and ready');

// Start the Gmail polling loop
startPolling();
