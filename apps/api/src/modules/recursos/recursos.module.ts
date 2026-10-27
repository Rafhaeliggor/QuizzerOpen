import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { CorrecaoModule } from '../correcao/correcao.module.js';
import { ProvasModule } from '../provas/provas.module.js';
import { RecursosAlunoController, RecursosController } from './recursos.controller.js';
import { RecursosService } from './recursos.service.js';

@Module({
  imports: [CorrecaoModule, ProvasModule, UsuariosModule],
  controllers: [RecursosController, RecursosAlunoController],
  providers: [RecursosService],
  exports: [RecursosService],
})
export class RecursosModule {}
