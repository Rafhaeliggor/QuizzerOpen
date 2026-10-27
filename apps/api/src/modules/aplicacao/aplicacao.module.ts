import { Module } from '@nestjs/common';
import { CorrecaoModule } from '../correcao/correcao.module.js';
import { ProvasModule } from '../provas/provas.module.js';
import { RecursosModule } from '../recursos/recursos.module.js';
import { TurmasModule } from '../turmas/turmas.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AplicacoesController, ExecucaoAlunoController, PublicoController } from './aplicacao.controller.js';
import { AplicacoesService } from './aplicacoes.service.js';
import { ExecucaoService } from './execucao.service.js';

@Module({
  imports: [ProvasModule, TurmasModule, UsuariosModule, CorrecaoModule, RecursosModule],
  controllers: [AplicacoesController, ExecucaoAlunoController, PublicoController],
  providers: [AplicacoesService, ExecucaoService],
  exports: [ExecucaoService],
})
export class AplicacaoModule {}
