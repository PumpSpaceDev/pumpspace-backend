import { Controller, Get, Param, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  @Get(':walletAddress')
  async getNotifications(@Param('walletAddress') walletAddress: string) {
    return this.notificationService.getNotifications(walletAddress);
  }
}
