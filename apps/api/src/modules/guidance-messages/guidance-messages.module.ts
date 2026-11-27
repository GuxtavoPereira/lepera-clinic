import { Module } from '@nestjs/common';
import { GuidanceMessagesController } from './guidance-messages.controller';
import { GuidanceMessagesService } from './guidance-messages.service';

@Module({
  controllers: [GuidanceMessagesController],
  providers: [GuidanceMessagesService],
  exports: [GuidanceMessagesService],
})
export class GuidanceMessagesModule {}
