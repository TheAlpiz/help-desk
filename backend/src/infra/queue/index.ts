import { Queue, Worker } from 'bullmq';
import { env } from '../env';
import { logger } from '../logger';

export const defaultQueue = new Queue('default-queue', { connection: { url: env.REDIS_URL } });

export const defaultWorker = new Worker('default-queue', async job => {
  logger.info(`Processing job ${job.id}`);
}, { connection: { url: env.REDIS_URL } });
