import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export { connection };

// Job types
export type ProcessNewMessageJob = {
  provider: string;
  providerAccountId: string;
  gmailMessageId: string;
};

export type ClassifyAndSummarizeJob = {
  messageId: string;
  userId: string;
};

export type UnsubscribeJob = {
  messageId: string;
  userId: string;
};

// Queue creation helpers
export const createProcessNewMessageQueue = () =>
  new Queue<ProcessNewMessageJob>('processNewMessage', { connection });

export const createClassifyAndSummarizeQueue = () =>
  new Queue<ClassifyAndSummarizeJob>('classifyAndSummarize', { connection });

export const createUnsubscribeQueue = () =>
  new Queue<UnsubscribeJob>('unsubscribe', { connection });
