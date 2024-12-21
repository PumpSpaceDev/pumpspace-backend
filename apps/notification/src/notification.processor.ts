import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  @Process({
    name: 'process',
    concurrency: 3,
  })
  async handleNotification(job: Job) {
    const { notificationId, type, data } = job.data;

    try {
      this.logger.log(
        `Processing notification ${notificationId} of type ${type} (attempt ${job.attemptsMade + 1})`,
      );

      // Here you would implement the actual notification delivery logic
      // For example, sending to a webhook, email, or push notification service
      await this.processNotificationByType(type, data);

      // Mark as processed
      await this.notificationRepository.update(notificationId, {
        processed: true,
      });

      this.logger.log(
        `Successfully processed notification ${notificationId} after ${
          job.attemptsMade + 1
        } attempts`,
      );

      // Clean up the job after successful processing
      await job.remove();
    } catch (error) {
      this.logger.error(
        `Failed to process notification ${notificationId} (attempt ${
          job.attemptsMade + 1
        }):`,
        error,
      );

      // If we've exceeded max retries, mark as failed but don't throw
      if (job.attemptsMade >= 2) {
        await this.notificationRepository.update(notificationId, {
          processed: true,
          data: {
            ...job.data.data,
            error: error.message,
            failedAttempts: job.attemptsMade + 1,
          },
        });
        this.logger.warn(
          `Notification ${notificationId} marked as failed after ${
            job.attemptsMade + 1
          } attempts`,
        );
        return;
      }

      throw error; // Allow Bull to retry the job
    }
  }

  private async processNotificationByType(
    type: string,
    data: any,
  ): Promise<void> {
    switch (type) {
      case 'SMART_MONEY_MATCH':
        await this.processSmartMoneyMatch(data);
        break;
      default:
        this.logger.warn(`Unknown notification type: ${type}`);
    }
  }

  private async processSmartMoneyMatch(data: any): Promise<void> {
    // Implement the actual delivery logic here
    // For example:
    // - Send webhook to external service
    // - Send email notification
    // - Push to mobile device
    this.logger.log('Processing smart money match:', data);
  }
}
