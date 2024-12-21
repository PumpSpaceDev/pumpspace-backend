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

  @Process('process')
  async handleNotification(job: Job) {
    const { notificationId, type, data } = job.data;

    try {
      this.logger.log(
        `Processing notification ${notificationId} of type ${type}`,
      );

      // Here you would implement the actual notification delivery logic
      // For example, sending to a webhook, email, or push notification service
      await this.processNotificationByType(type, data);

      // Mark as processed
      await this.notificationRepository.update(notificationId, {
        processed: true,
      });

      this.logger.log(`Successfully processed notification ${notificationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process notification ${notificationId}:`,
        error,
      );
      throw error;
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
