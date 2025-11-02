import { createProcessNewMessageQueue, createUnsubscribeQueue, ProcessNewMessageJob, UnsubscribeJob } from './redis';

/**
 * Enqueue a job to process a new Gmail message
 */
export async function enqueueProcessNewMessage(
  provider: string,
  providerAccountId: string,
  gmailMessageId: string
) {
  const queue = createProcessNewMessageQueue();

  const job: ProcessNewMessageJob = {
    provider,
    providerAccountId,
    gmailMessageId,
  };

  await queue.add('processNewMessage', job, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  console.log(`Enqueued message ${gmailMessageId} for account ${provider}:${providerAccountId}`);
}

/**
 * Enqueue a job to unsubscribe from an email
 */
export async function enqueueUnsubscribeJob(
  messageId: string,
  userId: string
) {
  const queue = createUnsubscribeQueue();

  const job: UnsubscribeJob = {
    messageId,
    userId,
  };

  await queue.add('unsubscribe', job, {
    attempts: 2, // Retry once if it fails
    backoff: {
      type: 'exponential',
      delay: 5000, // Wait 5 seconds before retry
    },
  });

  console.log(`Enqueued unsubscribe job for message ${messageId}`);
}
