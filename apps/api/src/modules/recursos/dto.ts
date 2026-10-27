import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PoliticaAnulacao, StatusRecurso } from '../../generated/prisma/enums.js';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AbrirRecursoDto {
  @IsUUID()
  notaId!: string;

  @IsUUID()
  versaoQuestaoId!: string;

  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Explique o motivo da contestação' })
  @MaxLength(5000)
  justificativa!: string;
}

export class EncaminharRecursoDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Explique por que encaminhar à coordenação' })
  @MaxLength(2000)
  motivo!: string;
}

export class DecidirRecursoDto {
  @IsBoolean()
  deferido!: boolean;

  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Justifique a decisão' })
  @MaxLength(5000)
  decisao!: string;

  /** Só para deferimento: ajustar a nota deste aluno ou anular a questão para todos. */
  @ValidateIf((o: DecidirRecursoDto) => o.deferido)
  @IsIn(['AJUSTE_INDIVIDUAL', 'ANULACAO'], { message: 'Escolha como aplicar o deferimento' })
  efeito?: 'AJUSTE_INDIVIDUAL' | 'ANULACAO';

  @ValidateIf((o: DecidirRecursoDto) => o.deferido && o.efeito === 'AJUSTE_INDIVIDUAL')
  @IsInt()
  @Min(0)
  @Max(100)
  percentual?: number;

  @ValidateIf((o: DecidirRecursoDto) => o.deferido && o.efeito === 'ANULACAO')
  @IsEnum(PoliticaAnulacao, { message: 'Escolha a política de anulação' })
  politica?: PoliticaAnulacao;
}

export class ListarRecursosDto {
  @IsOptional()
  @IsEnum(StatusRecurso)
  status?: StatusRecurso;
}
