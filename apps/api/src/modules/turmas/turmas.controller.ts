import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { AmbienteRequerido, Papeis, UsuarioAtual } from '../../common/auth/decorators.js';
import { PAPEIS_AUTORIA } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { AdicionarAlunoDto, DefinirProfessoresDto, ImportarCsvDto, SalvarTurmaDto, TransferirAlunoDto } from './dto.js';
import { TurmasService } from './turmas.service.js';

@Controller('turmas')
@AmbienteRequerido('PROFISSIONAL')
@Papeis(...PAPEIS_AUTORIA)
export class TurmasController {
  constructor(private readonly turmas: TurmasService) {}

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.turmas.listar(u);
  }

  @Get(':id')
  obter(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.turmas.obter(u, id);
  }

  @Post()
  criar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: SalvarTurmaDto) {
    return this.turmas.criar(u, dto);
  }

  @Put(':id')
  editar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SalvarTurmaDto,
  ) {
    return this.turmas.editar(u, id, dto);
  }

  @Post(':id/alunos/:alunoId/transferir')
  @HttpCode(200)
  transferir(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto: TransferirAlunoDto,
  ) {
    return this.turmas.transferirAluno(u, id, alunoId, dto.turmaDestinoId);
  }

  @Put(':id/professores')
  definirProfessores(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DefinirProfessoresDto,
  ) {
    return this.turmas.definirProfessores(u, id, dto.professorIds);
  }

  @Post(':id/alunos')
  adicionarAluno(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdicionarAlunoDto,
  ) {
    return this.turmas.adicionarAluno(u, id, dto);
  }

  @Delete(':id/alunos/:alunoId')
  @HttpCode(204)
  removerAluno(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
  ) {
    return this.turmas.removerAluno(u, id, alunoId);
  }

  @Post(':id/importacao')
  @HttpCode(200)
  importar(
    @UsuarioAtual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImportarCsvDto,
  ) {
    return this.turmas.importarCsv(u, id, dto.conteudo);
  }
}
