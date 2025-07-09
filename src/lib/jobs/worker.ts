/**
 * Background Jobs Worker for Pixelated Empathy
 *
 * This worker processes jobs from the Redis-backed queue,
 * offloading long-running tasks like batch bias analysis.
 */

import { jobQueue, JobStatus, type Job } from './queue';
import { BiasDetectionEngine } from '../ai/bias-detection/BiasDetectionEngine';
import { getLogger } from '../../utils/logger';

const logger = getLogger('JobsWorker');

// Initialize BiasDetectionEngine (singleton)
const biasDetectionEngine = new BiasDetectionEngine();

// Ensure the engine is initialized before processing jobs
async function initializeEngine() {
  if (!(biasDetectionEngine as any).isInitialized) {
    await biasDetectionEngine.initialize();
  }
}

const WORKER_INTERVAL_MS = 5000; // Check for new jobs every 5 seconds
const MAX_CONCURRENT_JOBS = 2; // Limit concurrent long-running jobs

let activeJobs = 0;
let workerInterval: NodeJS.Timeout | undefined;

const jobsWorker = {
  async start() {
    logger.info('Background Jobs Worker starting...');
    await initializeEngine();

    workerInterval = setInterval(this.processJobs, WORKER_INTERVAL_MS);

    logger.info('Background Jobs Worker started successfully.');
  },

  async stop() {
    logger.info('Background Jobs Worker shutting down...');
    if (workerInterval) {
      clearInterval(workerInterval);
    }
    await biasDetectionEngine.dispose();
    logger.info('Background Jobs Worker stopped.');
    process.exit(0);
  },

  private async processJobs() {
    if (activeJobs >= MAX_CONCURRENT_JOBS) {
      logger.debug('Max concurrent jobs reached, waiting...');
      return;
    }

    const job = await jobQueue.dequeue();

    if (job) {
      activeJobs++;
      logger.info('Processing new job', { jobId: job.id, type: job.type });
      this.executeJob(job)
        .then(() => {
          activeJobs--;
          logger.info('Job finished', { jobId: job.id, type: job.type });
        })
        .catch(error => {
          activeJobs--;
          logger.error('Job execution failed', { jobId: job.id, type: job.type, error });
        });
    } else {
      logger.debug('No jobs in queue.');
    }
  },

  private async executeJob(job: Job): Promise<void> {
    try {
      await jobQueue.updateJobStatus(job.id, JobStatus.IN_PROGRESS, { startedAt: new Date().toISOString() });

      switch (job.type) {
        case 'bias-analysis-batch':
          // Assuming payload contains { sessions: TherapeuticSession[], user: any, request: any }
          const { sessions, user, request } = job.payload as { sessions: any[], user: any, request: any };
          const results = await biasDetectionEngine.analyzeSessionsBatch(sessions, user, request);
          await jobQueue.updateJobStatus(job.id, JobStatus.COMPLETED, { result: results, completedAt: new Date().toISOString() });
          break;
        case 'report-generation':
          // Assuming payload contains { sessions: TherapeuticSession[], timeRange: any, options: any }
          const { sessions: reportSessions, timeRange, options } = job.payload as { sessions: any[], timeRange: any, options: any };
          const report = await (biasDetectionEngine as any)._generateBiasReportInternal(reportSessions, timeRange, options);
          await jobQueue.updateJobStatus(job.id, JobStatus.COMPLETED, { result: report, completedAt: new Date().toISOString() });
          break;
        // TODO: Add other job types as needed (e.g., data-cleanup, metric-aggregation)
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      await jobQueue.updateJobStatus(job.id, JobStatus.FAILED, { error: error instanceof Error ? error.message : String(error), completedAt: new Date().toISOString() });
    }
  },
};

// Graceful shutdown
process.on('SIGTERM', () => jobsWorker.stop());
process.on('SIGINT', () => jobsWorker.stop());

// Start worker
jobsWorker.start().catch((error) => {
  logger.error('Failed to start background jobs worker:', error);
  process.exit(1);
});
