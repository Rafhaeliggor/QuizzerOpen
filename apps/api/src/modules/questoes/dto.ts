import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Dificuldade, FormatoQuestao, NaturezaQuestao, StatusQuestao } from '../../generated/prisma/enums.js';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AlternativaDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Alternativa vazia' })
  @MaxLength(2000)
  texto!: string;
}

export class ItemRubricaDto {
  @Transform(aparar) @IsString() @IsNotEmpty({ message: 'Descreva o critério' }) @MaxLength(500)
  descricao!: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.25) @Max(100)
  pontos!: number;
}

export class ParAssociacaoDto {
  @Transform(aparar) @IsString() @IsNotEmpty({ message: 'Item vazio' }) @MaxLength(500)
  item!: string;

  @Transform(aparar) @IsString() @IsNotEmpty({ message: 'Opção vazia' }) @MaxLength(500)
  opcao!: string;
}

export class SalvarQuestaoDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe a disciplina' })
  @MaxLength(120)
  disciplina!: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(200)
  topico?: string;

  @IsEnum(Dificuldade, { message: 'Dificuldade inválida' })
  dificuldade!: Dificuldade;

  /** Mantido por compatibilidade: sem `formato`, FECHADA = múltipla escolha e ABERTA = dissertativa. */
  @IsOptional()
  @IsEnum(NaturezaQuestao, { message: 'Natureza inválida' })
  natureza?: NaturezaQuestao;

  /** Formato da questão (RF04). Define a natureza: só DISSERTATIVA é aberta. */
  @IsOptional()
  @IsEnum(FormatoQuestao, { message: 'Formato inválido' })
  formato?: FormatoQuestao;

  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o enunciado' })
  @MaxLength(20000)
  enunciado!: string;

  /** Obrigatório para questões fechadas (2 a 10). */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AlternativaDto)
  @ArrayMaxSize(10)
  alternativas?: AlternativaDto[];

  /** Índice (0-based) da alternativa correta — múltipla escolha; em V/F, 0 = Verdadeiro e 1 = Falso. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9)
  alternativaCorreta?: number;

  /** Critérios de correção — questões abertas. */
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(10000)
  rubrica?: string;

  /** Dissertativa: rubrica estruturada — critérios com pontuação (lote 8). */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItemRubricaDto)
  @ArrayMaxSize(20)
  rubricaItens?: ItemRubricaDto[];

  /** Várias corretas: índices (0-based) das alternativas corretas. */
  @IsOptional()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(9, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  alternativasCorretas?: number[];

  /** Associação: pares corretos (coluna A → coluna B), 2 a 10. */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ParAssociacaoDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  associacoes?: ParAssociacaoDto[];

  /** Associação: opções extras da coluna B que não correspondem a nenhum item (distratores). */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)) : value))
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(500, { each: true })
  @ArrayMaxSize(5)
  opcoesExtras?: string[];

  /** Ordenação: itens NA ORDEM CORRETA (2 a 10); o participante recebe embaralhados. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)) : value))
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(500, { each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  itensOrdem?: string[];

  /** Resposta numérica: valor esperado. */
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Valor numérico inválido' })
  valorNumerico?: number;

  /** Resposta numérica: tolerância absoluta (± valor). */
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  tolerancia?: number;

  /** Resposta curta: respostas aceitas (comparação sem acento, caixa e espaços extras). */
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  respostasAceitas?: string[];

  /** Mídias da versão (enviadas antes por POST /midias). */
  @IsOptional()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(10)
  midiaIds?: string[];

  /** Alto risco/certificação: edição depois de publicada exige nova aprovação. */
  @IsOptional()
  @IsBoolean()
  altoRisco?: boolean;
}

export class EnviarRevisaoDto {
  /** Envia mesmo com alerta de possível duplicidade. */
  @IsOptional()
  @IsBoolean()
  confirmarDuplicidade?: boolean;
}

export class RejeitarDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Explique o que precisa ser ajustado' })
  @MaxLength(2000)
  comentario!: string;
}

export class ListarQuestoesDto {
  @IsOptional() @IsEnum(StatusQuestao)
  status?: StatusQuestao;

  @IsOptional() @IsEnum(NaturezaQuestao)
  natureza?: NaturezaQuestao;

  /** Tipo da questão (Figma — feature 037). */
  @IsOptional() @IsEnum(FormatoQuestao, { message: 'Tipo de questão inválido' })
  formato?: FormatoQuestao;

  @IsOptional() @IsEnum(Dificuldade, { message: 'Dificuldade inválida' })
  dificuldade?: Dificuldade;

  @IsOptional() @Transform(aparar) @IsString() @MaxLength(120)
  disciplina?: string;

  @IsOptional() @Transform(aparar) @IsString() @MaxLength(200)
  busca?: string;

  /** minhas = de minha autoria · revisao = aguardando minha revisão · publicadas */
  @IsOptional() @IsIn(['todas', 'minhas', 'revisao', 'publicadas'])
  escopo: 'todas' | 'minhas' | 'revisao' | 'publicadas' = 'todas';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000)
  pagina = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  tamanho = 20;
}
