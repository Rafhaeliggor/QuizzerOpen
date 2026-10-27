import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AmbienteRequerido, Papeis, Publico, UsuarioAtual } from '../../common/auth/decorators.js';
import { PAPEIS_AUTORIA } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { MidiasService } from './midias.service.js';

@Controller('midias')
export class MidiasController {
  constructor(private readonly midias: MidiasService) {}

  /** Upload (multipart, campo "arquivo"). Limite duro no parser: 10 MB. */
  @Post()
  @AmbienteRequerido('PROFISSIONAL')
  @Papeis(...PAPEIS_AUTORIA)
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  enviar(@UsuarioAtual() u: UsuarioAutenticado, @UploadedFile() arquivo?: Express.Multer.File) {
    return this.midias.enviar(u, arquivo);
  }

  /** Serve a mídia. Pública por URL de capacidade (nome aleatório de 128 bits — ADR-0032). */
  @Get(':arquivo')
  @Publico()
  @SkipThrottle()
  async servir(@Param('arquivo') arquivo: string, @Res() res: Response) {
    const m = await this.midias.localizar(arquivo);
    res.set({
      'Content-Type': m.mime,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Content-Disposition': 'inline',
    });
    res.sendFile(m.caminho);
  }
}
