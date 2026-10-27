import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { MidiasController } from './midias.controller.js';
import { MidiasService } from './midias.service.js';
import { QuestoesController } from './questoes.controller.js';
import { QuestoesService } from './questoes.service.js';

@Module({
  imports: [UsuariosModule],
  controllers: [QuestoesController, MidiasController],
  providers: [QuestoesService, MidiasService],
  exports: [QuestoesService, MidiasService],
})
export class QuestoesModule {}
