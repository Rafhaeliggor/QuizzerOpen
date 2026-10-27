import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinDate,
  ValidateNested,
} from 'class-validator';
import type { Request } from 'express';
import { AmbienteRequerido, Papeis, Publico, UsuarioAtual } from '../../common/auth/decorators.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { CorrecaoService } from '../correcao/correcao.service.js';
import { ChavesIntegracaoService, ESCOPOS_INTEGRACAO } from '../iam/chaves-integracao.service.js';
import { TurmasService } from '../turmas/turmas.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { Escopo, IntegracaoGuard } from './integracao.guard.js';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const CODIGO = /^[A-Za-z0-9._:-]{1,64}$/;

class FiltroNotasDto {
  /** Só resultados consolidados a partir deste instante (ISO 8601). */
  @IsOptional() @Type(() => Date) @IsDate({ message: 'Data inválida' })
  desde?: Date;

  @IsOptional() @IsUUID()
  provaId?: string;

  /** Código externo da turma. */
  @IsOptional() @Matches(CODIGO)
  turma?: string;

  @IsOptional() @IsString() @MaxLength(200)
  cursor?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500)
  limite = 100;
}

class AlunoExternoDto {
  @Transform(aparar) @IsString() @IsNotEmpty() @MaxLength(200)
  nome!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsOptional() @Transform(aparar) @IsString() @MaxLength(50)
  matricula?: string;
}

class TurmaExternaDto {
  @Transform(aparar) @IsString() @IsNotEmpty() @MaxLength(200)
  nome!: string;

  @IsISO8601()
  periodoInicio!: string;

  @IsISO8601()
  periodoFim!: string;

  @IsEmail()
  professorEmail!: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => AlunoExternoDto) @ArrayMaxSize(1000)
  alunos!: AlunoExternoDto[];

  /** Desvincula quem está na turma e não veio na lista (histórico preservado). */
  @IsOptional() @IsBoolean()
  removerAusentes?: boolean;
}

class NovaChaveDto {
  @Transform(aparar) @IsString() @IsNotEmpty({ message: 'Dê um nome à chave (ex.: "Moodle")' }) @MaxLength(100)
  nome!: string;

  @IsArray() @IsIn(Object.keys(ESCOPOS_INTEGRACAO), { each: true, message: 'Escopo inválido' })
  escopos!: string[];

  @IsOptional() @Type(() => Date) @IsDate() @MinDate(() => new Date(), { message: 'A validade deve ser no futuro' })
  expiraEm?: Date;
}

/**
 * API de integração com sistemas acadêmicos (LMS/ERP — RNF01, lote 8, ADR-0051).
 * Autenticação por chave (não por usuário): `Authorization: Bearer qz_<prefixo>_<segredo>`.
 */
@Controller('integracao/v1')
@Publico()
@UseGuards(IntegracaoGuard)
export class IntegracaoController {
  constructor(
    private readonly correcao: CorrecaoService,
    private readonly turmas: TurmasService,
    private readonly usuarios: UsuariosService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** Resultados consolidados de alunos (com conta), em páginas por cursor. */
  @Get('notas')
  @Escopo('notas:ler')
  async notas(@Query() f: FiltroNotasDto) {
    const turmaIds = f.turma ? [...(await this.turmas.idsPorCodigoExterno([f.turma])).keys()] : undefined;
    if (turmaIds && turmaIds.length === 0) return { itens: [], proximoCursor: null };
    const r = await this.correcao.notasParaIntegracao({ desde: f.desde, provaId: f.provaId, turmaIds, cursor: f.cursor, limite: f.limite });
    const alunos = await this.usuarios.resumos(r.itens.map((n) => n.usuarioId!));
    const codigos = await this.turmas.codigosExternos(r.itens.map((n) => n.turmaId).filter((x): x is string => !!x));
    return {
      proximoCursor: r.proximoCursor,
      itens: r.itens.map((n) => {
        const a = alunos.get(n.usuarioId!);
        return {
          resultadoId: n.id,
          provaId: n.provaId,
          provaTitulo: n.provaTitulo,
          turmaCodigoExterno: n.turmaId ? (codigos.get(n.turmaId) ?? null) : null,
          aluno: { email: a?.email ?? null, matricula: a?.matricula ?? null, nome: a?.nome ?? n.participanteNome },
          tentativa: n.tentativaNumero,
          nota: n.notaFinal == null ? null : Number(n.notaFinal),
          situacao: n.statusAprovacao,
          enviadoEm: n.fimEm,
          consolidadoEm: n.consolidadaEm,
        };
      }),
    };
  }

  @Get('turmas')
  @Escopo('turmas:ler')
  listarTurmas() {
    return this.turmas.listarParaIntegracao();
  }

  /** Cria ou atualiza a turma pelo código do sistema acadêmico e sincroniza as matrículas. */
  @Put('turmas/:codigo')
  @Escopo('turmas:escrever')
  async sincronizar(@Param('codigo') codigo: string, @Body() dto: TurmaExternaDto, @Req() req: Request) {
    if (!CODIGO.test(codigo)) throw new BadRequestException('Código de turma inválido');
    const chave = req.integracao!;
    const r = await this.turmas.sincronizarExterna(codigo, dto, chave.criadoPorId);
    await this.auditoria.registrar({
      usuarioId: null,
      acao: 'INTEGRACAO_TURMA_SINCRONIZADA',
      recurso: 'turma',
      recursoId: r.turmaId,
      dados: { chave: chave.prefixo, codigo, matriculados: r.matriculados, desvinculados: r.desvinculados, erros: r.erros.length },
    });
    return r;
  }
}

/** Administração das chaves de integração (Administrador). */
@Controller('integracao/chaves')
@AmbienteRequerido('PROFISSIONAL')
@Papeis('ADMINISTRADOR')
export class ChavesIntegracaoController {
  constructor(private readonly chaves: ChavesIntegracaoService) {}

  @Get('escopos')
  escopos() {
    return this.chaves.catalogo();
  }

  @Get()
  listar() {
    return this.chaves.listar();
  }

  /** O token completo aparece SÓ nesta resposta. */
  @Post()
  criar(@UsuarioAtual() u: UsuarioAutenticado, @Body() dto: NovaChaveDto) {
    return this.chaves.criar(u, dto);
  }

  @Post(':id/revogar')
  @HttpCode(200)
  revogar(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.chaves.revogar(u, id);
  }
}
