import { Module } from '@nestjs/common';
import { QuestoesModule } from '../questoes/questoes.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { ProvasController } from './provas.controller.js';
import { ProvasService } from './provas.service.js';

@Module({
  imports: [QuestoesModule, UsuariosModule],
  controllers: [ProvasController],
  providers: [ProvasService],
  exports: [ProvasService],
})
export class ProvasModule {}
