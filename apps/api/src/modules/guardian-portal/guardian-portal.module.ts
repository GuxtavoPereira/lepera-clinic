import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { GuardianPortalController } from './guardian-portal.controller';
import { GuardianPortalService } from './guardian-portal.service';

@Module({
  imports: [UsersModule],
  controllers: [GuardianPortalController],
  providers: [GuardianPortalService],
  exports: [GuardianPortalService],
})
export class GuardianPortalModule {}
