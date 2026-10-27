import {
  IsEmail,
  IsJWT,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Política mínima de senha: 10+ caracteres com letras e números. */
export const POLITICA_SENHA = /^(?=.*[A-Za-z])(?=.*\d).{10,128}$/;

export class LoginProfissionalDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha' })
  @MaxLength(128)
  senha!: string;
}

export class LoginAlunoDto {
  /** E-mail ou matrícula. */
  @IsString()
  @IsNotEmpty({ message: 'Informe e-mail ou matrícula' })
  @MaxLength(254)
  login!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha' })
  @MaxLength(128)
  senha!: string;
}

export class MfaTokenDto {
  @IsJWT({ message: 'Token de verificação inválido' })
  mfaToken!: string;
}

export class VerificarMfaDto extends MfaTokenDto {
  /** 6 dígitos do app autenticador ou um código de recuperação (XXXX-XXXX). */
  @Matches(/^(\d{6}|[A-Za-z0-9]{4}-?[A-Za-z0-9]{4})$/, { message: 'Informe o código de 6 dígitos ou um código de recuperação' })
  codigo!: string;
}

export class EsqueciSenhaDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(254)
  email!: string;
}

export class RedefinirSenhaDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Link inválido' })
  token!: string;

  @IsString()
  @MinLength(10, { message: 'A nova senha deve ter ao menos 10 caracteres' })
  @Matches(POLITICA_SENHA, { message: 'A nova senha deve conter letras e números (10 a 128 caracteres)' })
  novaSenha!: string;
}

export class TrocarSenhaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  senhaAtual!: string;

  @IsString()
  @MinLength(10, { message: 'A nova senha deve ter ao menos 10 caracteres' })
  @Matches(POLITICA_SENHA, {
    message: 'A nova senha deve conter letras e números (10 a 128 caracteres)',
  })
  novaSenha!: string;
}
