import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from './logger.service';

@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const correlationId = uuidv4();
    LoggerService.setCorrelationId(correlationId);

    const request = context.switchToHttp().getRequest();
    request.correlationId = correlationId;

    return next.handle();
  }
}
