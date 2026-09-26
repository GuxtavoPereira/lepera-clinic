// apps/api/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthController } from '../users/auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule, // pega emprestado o UsersService (ver "exports" do UsersModule)
    JwtModule.registerAsync({
      // "async" porque a chave secreta vem do .env, que só existe depois
      // que o ConfigModule termina de carregar.
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
