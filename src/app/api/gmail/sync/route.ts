import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listGmailHistory } from '@/lib/gmail';
import { enqueueProcessNewMessage } from '@/lib/queue';

/**
 * POST /api/gmail/sync
 * Manually trigger a sync for the current user's Gmail account(s)
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all Google accounts for this user
    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        provider: 'google',
        history_id: { not: null },
      },
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No Google accounts connected with history tracking enabled' },
        { status: 404 }
      );
    }

    let totalNewMessages = 0;
    const results = [];

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
          for (const messageId of newMessages) {
            await enqueueProcessNewMessage(account.provider, account.providerAccountId, messageId);
          }
          totalNewMessages += newMessages.length;
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

        results.push({
          accountId: `${account.provider}:${account.providerAccountId}`,
          newMessages: newMessages.length,
          success: true,
        });
      } catch (error) {
        console.error(
          `Error syncing account ${account.provider}:${account.providerAccountId}:`,
          error
        );
        results.push({
          accountId: `${account.provider}:${account.providerAccountId}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalNewMessages,
      accounts: results,
    });
  } catch (error) {
    console.error('Error in sync endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to sync Gmail accounts' },
      { status: 500 }
    );
  }
}
