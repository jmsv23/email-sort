import { createProcessNewMessageQueue, ProcessNewMessageJob } from './redis';

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
