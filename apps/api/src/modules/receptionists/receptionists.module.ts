import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ReceptionistsController } from './receptionists.controller';
import { ReceptionistsService } from './receptionists.service';

@Module({
  imports: [UsersModule],
  controllers: [ReceptionistsController],
  providers: [ReceptionistsService],
})
export class ReceptionistsModule {}
