import { Module } from '@nestjs/common';
import { CorrecaoModule } from '../correcao/correcao.module.js';
import { IamModule } from '../iam/iam.module.js';
import { TurmasModule } from '../turmas/turmas.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { ChavesIntegracaoController, IntegracaoController } from './integracao.controller.js';
import { IntegracaoGuard } from './integracao.guard.js';

@Module({
  imports: [IamModule, CorrecaoModule, TurmasModule, UsuariosModule],
  controllers: [IntegracaoController, ChavesIntegracaoController],
  providers: [IntegracaoGuard],
})
export class IntegracaoModule {}
