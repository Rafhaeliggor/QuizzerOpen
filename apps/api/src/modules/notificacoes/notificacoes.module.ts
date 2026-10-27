import { Global, Module } from '@nestjs/common';
import { NotificacoesController } from './notificacoes.controller.js';
import { NotificacoesService } from './notificacoes.service.js';
import { TempoRealService } from './tempo-real.service.js';

@Global()
@Module({
  controllers: [NotificacoesController],
  providers: [NotificacoesService, TempoRealService],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
