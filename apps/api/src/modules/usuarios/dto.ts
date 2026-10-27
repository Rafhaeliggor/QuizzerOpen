import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Papel } from '../../generated/prisma/enums.js';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CriarUsuarioDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome' })
  @MaxLength(200)
  nome!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(254)
  email!: string;

  @IsEnum(Papel, { message: 'Papel inválido' })
  papel!: Papel;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(50)
  matricula?: string;
}

export class ListarUsuariosDto {
  @IsOptional()
  @IsEnum(Papel)
  papel?: Papel;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(200)
  busca?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  pagina = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  tamanho = 20;
}

export class EditarUsuarioDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome' })
  @MaxLength(200)
  nome?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsEnum(Papel, { message: 'Papel inválido' })
  papel?: Papel;

  /** String vazia remove a matrícula. */
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(50)
  matricula?: string;
}

export class JustificativaDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'A justificativa é obrigatória' })
  @MaxLength(2000)
  justificativa!: string;
}
