import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { trashGmailMessage } from '@/lib/gmail';
import { enqueueUnsubscribeJob } from '@/lib/queue';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageIds, action } = body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'messageIds array is required' },
        { status: 400 }
      );
    }

    if (!action || !['delete', 'unsubscribe'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "delete" or "unsubscribe"' },
        { status: 400 }
      );
    }

    // Verify that all messages belong to the user
    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds },
        account: {
          userId: session.user.id,
        },
      },
      select: {
        id: true,
        subject: true,
        from: true,
        gmailMessageId: true,
        provider: true,
        providerAccountId: true,
        unsubscribeLink: true,
      },
    });

    if (messages.length !== messageIds.length) {
      return NextResponse.json(
        { error: 'Some messages do not exist or do not belong to you' },
        { status: 403 }
      );
    }

    // Mock implementation - log the action
    console.log(`Bulk action "${action}" requested for ${messages.length} messages by user ${session.user.id}`);
    console.log('Message IDs:', messageIds);

    if (action === 'delete') {
      // Move messages to Gmail trash and mark as archived in DB
      let successCount = 0;
      let failureCount = 0;
      const errors: { messageId: string; error: string }[] = [];

      for (const message of messages) {
        try {
          // Move to Gmail trash
          await trashGmailMessage(
            message.provider,
            message.providerAccountId,
            message.gmailMessageId
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to trash Gmail message ${message.gmailMessageId}:`, error);
          failureCount++;
          errors.push({
            messageId: message.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Mark all messages as archived in database (soft delete)
      // Do this even if some Gmail API calls failed
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
        },
        data: {
          archived: true,
        },
      });

      // Invalidate cache for home page to refresh message list
      revalidatePath('/');

      return NextResponse.json({
        success: true,
        action: 'delete',
        count: messages.length,
        successCount,
        failureCount,
        message: failureCount > 0
          ? `Deleted ${successCount} message(s). ${failureCount} failed to delete from Gmail but were archived locally.`
          : `Successfully deleted ${successCount} message(s)`,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    if (action === 'unsubscribe') {
      // Filter messages that have unsubscribe links
      const messagesWithUnsubscribeLinks = messages.filter(
        (msg) => msg.unsubscribeLink && msg.unsubscribeLink.trim() !== ''
      );

      const messagesWithoutLinks = messages.filter(
        (msg) => !msg.unsubscribeLink || msg.unsubscribeLink.trim() === ''
      );

      // Enqueue unsubscribe jobs for messages with unsubscribe links
      let enqueuedCount = 0;
      const errors: { messageId: string; error: string }[] = [];

      for (const message of messagesWithUnsubscribeLinks) {
        try {
          await enqueueUnsubscribeJob(message.id, session.user.id);
          enqueuedCount++;
        } catch (error) {
          console.error(`Failed to enqueue unsubscribe job for message ${message.id}:`, error);
          errors.push({
            messageId: message.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Build response with details about enqueued and skipped messages
      const skippedCount = messagesWithoutLinks.length;
      const skippedReasons = messagesWithoutLinks.map((msg) => ({
        messageId: msg.id,
        subject: msg.subject,
        reason: 'No unsubscribe link available',
      }));

      // Invalidate cache to refresh UI
      revalidatePath('/');

      return NextResponse.json({
        success: true,
        action: 'unsubscribe',
        enqueued: enqueuedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
        skippedReasons: skippedCount > 0 ? skippedReasons : undefined,
        message:
          skippedCount > 0
            ? `Enqueued ${enqueuedCount} message(s) for unsubscribe. Skipped ${skippedCount} message(s) without unsubscribe links.`
            : `Successfully enqueued ${enqueuedCount} message(s) for unsubscribe`,
      });
    }

    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}
