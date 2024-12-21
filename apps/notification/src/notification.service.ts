import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { ConfigService } from '@app/config';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    try {
      this.redis = new Redis(this.configService.redisConfig);
      this.redis.on('error', (err) => {
        this.logger.error('Redis connection error:', err);
      });
      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis');
      });
      this.subscribeToSmartMoneyMatches();
    } catch (error) {
      this.logger.error('Failed to initialize Redis connection:', error);
      throw error;
    }
  }

  private async subscribeToSmartMoneyMatches() {
    const subscriber = new Redis(this.configService.redisConfig);

    subscriber.subscribe('smart-money:matches', (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to smart money matches:', err);
        return;
      }
      this.logger.log('Subscribed to smart money matches');
    });

    subscriber.on('message', async (channel, message) => {
      try {
        const matchData = JSON.parse(message);
        await this.createNotification('SMART_MONEY_MATCH', matchData);
      } catch (error) {
        this.logger.error('Error processing smart money match:', error);
      }
    });
  }

  private async createNotification(type: string, data: any) {
    const notification = new Notification();
    notification.type = type;
    notification.data = data;
    notification.walletAddress = data.address;
    notification.channel = 'smart-money';

    // Save notification to database
    const savedNotification =
      await this.notificationRepository.save(notification);

    // Add to processing queue
    await this.notificationQueue.add('process', {
      notificationId: savedNotification.id,
      type,
      data,
    });
  }

  async getNotifications(walletAddress: string): Promise<Notification[]> {
    try {
      const notifications = await this.notificationRepository.find({
        where: { walletAddress },
        order: { createdAt: 'DESC' },
        take: 50,
      });
      this.logger.debug(
        `Found ${notifications.length} notifications for wallet ${walletAddress}`,
      );
      return notifications;
    } catch (error) {
      this.logger.error(
        `Error fetching notifications for wallet ${walletAddress}:`,
        error,
      );
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }
  }

  async markAsProcessed(id: number): Promise<void> {
    try {
      const result = await this.notificationRepository.update(id, {
        processed: true,
      });
      if (result.affected === 0) {
        this.logger.warn(`No notification found with id ${id}`);
        throw new Error(`Notification with id ${id} not found`);
      }
      this.logger.debug(`Marked notification ${id} as processed`);
    } catch (error) {
      this.logger.error(
        `Error marking notification ${id} as processed:`,
        error,
      );
      throw new Error(
        `Failed to mark notification as processed: ${error.message}`,
      );
    }
  }
}
