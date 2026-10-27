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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ExibicaoGabarito, ModoNavegacao, OrdemQuestoes, StatusProva, Visibilidade } from '../../generated/prisma/enums.js';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CriterioAprovacaoDto {
  /** NOTA_MINIMA: aprovado se nota (0–10) ≥ valor · NENHUM: sem critério. */
  @IsIn(['NOTA_MINIMA', 'NENHUM'], { message: 'Critério de aprovação inválido' })
  tipo!: 'NOTA_MINIMA' | 'NENHUM';

  @ValidateIf((o: CriterioAprovacaoDto) => o.tipo === 'NOTA_MINIMA')
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe a nota mínima' })
  @Min(0)
  @Max(10)
  valor?: number;
}

export class SalvarProvaDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o título' })
  @MaxLength(200)
  titulo!: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(5000)
  descricao?: string;

  @IsEnum(Visibilidade)
  visibilidade!: Visibilidade;

  @ValidateNested()
  @Type(() => CriterioAprovacaoDto)
  criterioAprovacao!: CriterioAprovacaoDto;

  /** Minutos; ausente/null = sem limite (vale o fim da janela da aplicação). */
  @IsOptional()
  @IsInt({ message: 'Tempo limite deve ser um número inteiro de minutos' })
  @Min(1)
  @Max(600)
  tempoLimiteMin?: number | null;

  @IsInt()
  @Min(1)
  @Max(10)
  tentativasPermitidas!: number;

  @IsEnum(ModoNavegacao)
  modoNavegacao!: ModoNavegacao;

  @IsEnum(OrdemQuestoes)
  ordemQuestoes!: OrdemQuestoes;

  /** Correção às cegas: corretores não veem o nome até o resultado consolidar (lote 8). */
  @IsOptional()
  @IsBoolean()
  correcaoAsCegas?: boolean;

  /** Verificação extra: só inicia quem tem MFA ativo na conta (RF05/RNF05). */
  @IsOptional()
  @IsBoolean()
  exigeMfa?: boolean;

  /** Quando o aluno vê o gabarito no resultado (RF07). */
  @IsOptional()
  @IsEnum(ExibicaoGabarito)
  exibirGabarito?: ExibicaoGabarito;

  /** Dias para abrir recurso após o resultado (RF08); ausente/null = sem prazo. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  prazoRecursoDias?: number | null;

  /** Dupla correção das questões abertas, com arbitragem acima do limiar (lote 9 — ADR-0053). */
  @IsOptional()
  @IsBoolean()
  correcaoDupla?: boolean;

  /** Divergência máxima (pontos percentuais) entre as duas correções antes de exigir arbitragem. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limiarDivergencia?: number;

  /** Permite pedir sugestão de nota à IA na correção (opt-in; nunca aplicada sozinha — ADR-0054). */
  @IsOptional()
  @IsBoolean()
  sugestaoIa?: boolean;

  /** Tempo limite por questão em segundos (só navegação sequencial — ADR-0055). */
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3600)
  tempoPorQuestaoSeg?: number | null;
}

export class ItemComposicaoDto {
  @IsUUID()
  versaoQuestaoId!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Peso inválido' })
  @Min(0.01, { message: 'Peso deve ser maior que zero' })
  @Max(100)
  peso!: number;
}

export class ComporProvaDto {
  @ValidateNested({ each: true })
  @Type(() => ItemComposicaoDto)
  @ArrayMaxSize(200)
  itens!: ItemComposicaoDto[];
}

export class ItemSecaoDto {
  @IsUUID()
  versaoQuestaoId!: string;

  /** FIXA: peso da questão. SORTEIO: ignorado (o peso da seção é dividido entre as sorteadas). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  peso?: number;
}

export class SecaoDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Dê um título à seção' })
  @MaxLength(200)
  titulo!: string;

  @IsIn(['FIXA', 'SORTEIO'], { message: 'Modo de seção inválido' })
  modo!: 'FIXA' | 'SORTEIO';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  sortear?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  peso?: number;

  /** Nota mínima (0–10) na seção para aprovação. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  notaMinima?: number | null;

  @ValidateNested({ each: true })
  @Type(() => ItemSecaoDto)
  @ArrayMaxSize(500)
  itens!: ItemSecaoDto[];
}

/** Composição por seções (lote 8). Uma única seção FIXA sem nota mínima = prova sem seções. */
export class ComporSecoesDto {
  @ValidateNested({ each: true })
  @Type(() => SecaoDto)
  @ArrayMinSize(1, { message: 'Crie ao menos uma seção' })
  @ArrayMaxSize(20)
  secoes!: SecaoDto[];
}

export class DefinirCorretoresDto {
  @IsUUID('all', { each: true })
  @ArrayMaxSize(50)
  usuarioIds!: string[];
}

export class ListarProvasDto {
  @IsOptional()
  @IsEnum(StatusProva)
  status?: StatusProva;
}
