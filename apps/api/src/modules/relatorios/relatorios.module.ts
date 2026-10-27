import { Module } from '@nestjs/common';
import { AplicacaoModule } from '../aplicacao/aplicacao.module.js';
import { CorrecaoModule } from '../correcao/correcao.module.js';
import { ProvasModule } from '../provas/provas.module.js';
import { TurmasModule } from '../turmas/turmas.module.js';
import { RelatoriosController } from './relatorios.controller.js';
import { RelatoriosService } from './relatorios.service.js';

@Module({
  imports: [CorrecaoModule, ProvasModule, TurmasModule, AplicacaoModule],
  controllers: [RelatoriosController],
  providers: [RelatoriosService],
})
export class RelatoriosModule {}
