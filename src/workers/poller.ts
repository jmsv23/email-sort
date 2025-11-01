import { prisma } from '@/lib/prisma';
import { listGmailHistory } from '@/lib/gmail';
import { enqueueProcessNewMessage } from '@/lib/queue';

/**
 * Poll interval in milliseconds (15 seconds)
 */
const POLL_INTERVAL = 15000;

/**
 * Poll all accounts for new Gmail messages using history API
 */
async function pollAccounts() {
  try {
    // Get all accounts that have a history_id set (meaning they're connected to Gmail)
    const accounts = await prisma.account.findMany({
      where: {
        provider: 'google',
        history_id: { not: null },
      },
    });

    console.log(`Polling ${accounts.length} accounts for new messages...`);

    for (const account of accounts) {
      try {
        if (!account.history_id) continue;

        // Fetch history changes since last poll
        const historyData = await listGmailHistory(
          account.provider,
          account.providerAccountId,
          account.history_id
        );

        // Extract new messages from history
        const newMessages: string[] = [];
        if (historyData.history && historyData.history.length > 0) {
          for (const historyRecord of historyData.history) {
            if (historyRecord.messagesAdded) {
              for (const addedMessage of historyRecord.messagesAdded) {
                if (addedMessage.message?.id) {
                  newMessages.push(addedMessage.message.id);
                }
              }
            }
          }
        }

        // Enqueue jobs for each new message
        if (newMessages.length > 0) {
          console.log(
            `Found ${newMessages.length} new messages for account ${account.provider}:${account.providerAccountId}`
          );

          for (const messageId of newMessages) {
            await enqueueProcessNewMessage(account.provider, account.providerAccountId, messageId);
          }
        }

        // Update history_id and last_polled_at
        if (historyData.historyId) {
          await prisma.account.update({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            data: {
              history_id: String(historyData.historyId),
              last_polled_at: new Date(),
            },
          });
        }
      } catch (error) {
        console.error(
          `Error polling account ${account.provider}:${account.providerAccountId}:`,
          error
        );
        // Continue to next account even if one fails
      }
    }
  } catch (error) {
    console.error('Error in pollAccounts:', error);
  }
}

/**
 * Start the polling loop
 */
export function startPolling() {
  console.log(`Starting Gmail polling with ${POLL_INTERVAL}ms interval...`);

  // Run initial poll immediately
  pollAccounts();

  // Then poll at regular intervals
  setInterval(() => {
    pollAccounts();
  }, POLL_INTERVAL);
}
