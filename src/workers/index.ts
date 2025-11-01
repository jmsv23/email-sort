import { Worker } from 'bullmq';
import { connection } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { fetchGmailMessage, archiveGmailMessage } from '@/lib/gmail';
import { getAIClient } from '@/ai/aiClient';
import { startPolling } from './poller';

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

    // Get body text (simplified)
    let bodyText = '';
    if (gmailMessage.payload?.body?.data) {
      bodyText = Buffer.from(gmailMessage.payload.body.data, 'base64').toString('utf-8');
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

    // Classify and summarize with AI
    const aiClient = getAIClient();

    const classification = await aiClient.classifyEmail({
      subject,
      from,
      text: bodyText,
      categories: account.user.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
      })),
    });

    const summary = await aiClient.summarizeEmail({
      subject,
      from,
      text: bodyText,
    });

    // Store message in database
    await prisma.message.create({
      data: {
        provider,
        providerAccountId,
        gmailMessageId,
        threadId: gmailMessage.threadId || null,
        categoryId: classification.categoryId || null,
        subject,
        from,
        to,
        snippet: gmailMessage.snippet || null,
        bodyText,
        bodyHtml: null, // TODO: Extract HTML body
        aiSummary: summary,
        aiClassification: classification as any,
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
