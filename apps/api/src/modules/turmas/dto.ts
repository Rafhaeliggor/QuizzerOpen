import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsEmail, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SalvarTurmaDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome da turma' })
  @MaxLength(200)
  nome!: string;

  @IsISO8601({ strict: true }, { message: 'Data de início inválida' })
  periodoInicio!: string;

  @IsISO8601({ strict: true }, { message: 'Data de fim inválida' })
  periodoFim!: string;

  /** Só Administrador/Coordenador escolhem; professor é sempre o responsável pelas próprias turmas. */
  @IsOptional()
  @IsUUID()
  professorResponsavelId?: string;
}

export class AdicionarAlunoDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do aluno' })
  @MaxLength(200)
  nome!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(50)
  matricula?: string;
}

export class ImportarCsvDto {
  /** Conteúdo do arquivo CSV (colunas: nome, email, matricula). Máx. ~1 MB. */
  @IsString()
  @IsNotEmpty({ message: 'Arquivo vazio' })
  @MaxLength(1_000_000)
  conteudo!: string;
}

export class DefinirProfessoresDto {
  @IsUUID('all', { each: true })
  @ArrayMaxSize(20)
  professorIds!: string[];
}

export class TransferirAlunoDto {
  @IsUUID('all', { message: 'Escolha a turma de destino' })
  turmaDestinoId!: string;
}
