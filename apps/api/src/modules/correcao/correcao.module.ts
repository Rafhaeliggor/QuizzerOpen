import { Module } from '@nestjs/common';
import { ProvasModule } from '../provas/provas.module.js';
import { CorrecaoController, ResultadosAlunoController } from './correcao.controller.js';
import { CorrecaoService } from './correcao.service.js';

@Module({
  imports: [ProvasModule],
  controllers: [CorrecaoController, ResultadosAlunoController],
  providers: [CorrecaoService],
  exports: [CorrecaoService],
})
export class CorrecaoModule {}
