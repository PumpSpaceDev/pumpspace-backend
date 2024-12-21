import {
  Controller,
  Get,
  Param,
  Logger,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { WalletAddressDto } from './dto/wallet-address.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Fetch notifications for a wallet address' })
  @ApiParam({
    name: 'walletAddress',
    required: true,
    type: 'string',
    description: 'Wallet address to fetch notifications for',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved notifications',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address format',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @Get(':walletAddress')
  async getNotifications(@Param(ValidationPipe) params: WalletAddressDto) {
    try {
      return await this.notificationService.getNotifications(
        params.walletAddress,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching notifications for wallet ${params.walletAddress}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to fetch notifications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
