import { Module } from '@nestjs/common';
import { AplicacaoModule } from '../aplicacao/aplicacao.module.js';
import { CorrecaoModule } from '../correcao/correcao.module.js';
import { IamModule } from '../iam/iam.module.js';
import { RecursosModule } from '../recursos/recursos.module.js';
import { TurmasModule } from '../turmas/turmas.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { LgpdController, MinhaContaController } from './lgpd.controller.js';
import { LgpdService } from './lgpd.service.js';

@Module({
  imports: [IamModule, UsuariosModule, TurmasModule, CorrecaoModule, RecursosModule, AplicacaoModule],
  controllers: [MinhaContaController, LgpdController],
  providers: [LgpdService],
})
export class LgpdModule {}
