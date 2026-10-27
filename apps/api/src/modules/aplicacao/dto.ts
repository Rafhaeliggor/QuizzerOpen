import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsObject,
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CriarAplicacaoDto {
  @IsUUID()
  provaId!: string;

  /**
   * TURMA (alunos matriculados, com login), ALUNO_AVULSO (alunos escolhidos, com login — lote 7)
   * ou PUBLICO (PIN/link + identificação mínima).
   */
  @IsIn(['TURMA', 'ALUNO_AVULSO', 'PUBLICO'], { message: 'Destino inválido' })
  destinoTipo!: 'TURMA' | 'ALUNO_AVULSO' | 'PUBLICO';

  @ValidateIf((o: CriarAplicacaoDto) => o.destinoTipo === 'TURMA')
  @IsUUID('all', { message: 'Escolha a turma' })
  turmaId?: string;

  @ValidateIf((o: CriarAplicacaoDto) => o.destinoTipo === 'ALUNO_AVULSO')
  @IsUUID('all', { each: true, message: 'Aluno inválido' })
  @ArrayMinSize(1, { message: 'Escolha ao menos um aluno' })
  @ArrayMaxSize(500)
  alunoIds?: string[];

  @IsISO8601({}, { message: 'Início da janela inválido' })
  janelaInicio!: string;

  @IsISO8601({}, { message: 'Fim da janela inválido' })
  janelaFim!: string;
}

export class ReabrirTentativaDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'A justificativa é obrigatória' })
  @MaxLength(2000)
  justificativa!: string;

  @IsInt()
  @Min(1)
  @Max(600)
  minutos!: number;
}

export class SalvarRespostaDto {
  /** Questão fechada: id da alternativa marcada (null limpa a resposta). */
  @IsOptional()
  @IsString()
  @MaxLength(5)
  alternativaId?: string | null;

  /** Várias corretas: ids marcados (lista vazia limpa a resposta). */
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(5, { each: true })
  @ArrayMaxSize(10)
  alternativaIds?: string[] | null;

  /** Associação: item → opção (ids). */
  @IsOptional()
  @IsObject()
  pares?: Record<string, string> | null;

  /** Ordenação: ids na ordem escolhida (opacos da instância, ex.: "k3f9a1c2" — ver `opacificar`). */
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(12, { each: true })
  @ArrayMaxSize(10)
  ordem?: string[] | null;

  /** Questão aberta: texto da resposta. */
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  texto?: string | null;
}

export class IniciarPublicoDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe seu nome' })
  @MaxLength(200)
  nome!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(254)
  email!: string;
}

export class FiltroAplicacoesDto {
  @IsOptional()
  @IsUUID()
  provaId?: string;
}

export class EventoTentativaDto {
  @IsIn(['SAIU_DA_PROVA', 'VOLTOU_A_PROVA'], { message: 'Evento inválido' })
  tipo!: 'SAIU_DA_PROVA' | 'VOLTOU_A_PROVA';

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  ocorridoEm?: Date;
}
