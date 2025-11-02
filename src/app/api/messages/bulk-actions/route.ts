import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { trashGmailMessage } from '@/lib/gmail';

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
      // TODO: Implement actual unsubscribe logic
      // 1. Extract unsubscribe links
      // 2. Enqueue unsubscribe jobs
      // 3. Update message status
      console.log('[MOCK] Would enqueue unsubscribe jobs for messages');

      return NextResponse.json({
        success: true,
        action: 'unsubscribe',
        count: messages.length,
        message: `Successfully queued ${messages.length} message(s) for unsubscribe (mocked)`,
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
