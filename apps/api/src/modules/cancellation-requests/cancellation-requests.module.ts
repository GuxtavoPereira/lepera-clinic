import { Module } from '@nestjs/common';
import { CancellationRequestsController } from './cancellation-requests.controller';
import { CancellationRequestsService } from './cancellation-requests.service';

@Module({
  controllers: [CancellationRequestsController],
  providers: [CancellationRequestsService],
})
export class CancellationRequestsModule {}
