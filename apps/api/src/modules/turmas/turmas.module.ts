import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { TurmasController } from './turmas.controller.js';
import { TurmasService } from './turmas.service.js';

@Module({
  imports: [UsuariosModule],
  controllers: [TurmasController],
  providers: [TurmasService],
  exports: [TurmasService],
})
export class TurmasModule {}
