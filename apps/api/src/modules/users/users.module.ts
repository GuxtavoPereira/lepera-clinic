// apps/api/src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Um MODULE é uma "caixinha" que agrupa: controllers (rotas), providers
 * (services, e outras classes injetáveis) e, se precisar, outros módulos.
 *
 * `exports` diz quais peças desta caixinha outros módulos podem pedir
 * emprestado. O AuthModule, no próximo passo, vai importar este UsersModule
 * só para poder usar o UsersService (procurar o usuário pelo e-mail).
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService, PasswordService],
  exports: [UsersService, PasswordService],
})
export class UsersModule {}
