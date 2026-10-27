import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';

/**
 * Parâmetros Argon2id mínimos recomendados pela OWASP (Password Storage Cheat Sheet):
 * m=19 MiB, t=2, p=1. Os padrões da lib (64 MiB, t=3, p=4) deixavam o login de uma turma
 * inteira lento demais (p95 de 12 s com 40 alunos em 2 vCPUs) — ver ADR-0023.
 */
export const PARAMETROS_ARGON2 = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Hash de senha com Argon2id. Ver docs/adr/0006-autenticacao-jwt-sessao.md e ADR-0023.
 */
@Injectable()
export class SenhaService {
  /**
   * Hash válido de uma senha aleatória, usado para equalizar o tempo de
   * resposta quando o usuário não existe (evita enumeração por timing).
   */
  private hashFicticio?: Promise<string>;

  hash(senha: string): Promise<string> {
    return argon2.hash(senha, PARAMETROS_ARGON2);
  }

  async verificar(hash: string, senha: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, senha);
    } catch {
      return false;
    }
  }

  /** Hash gerado com parâmetros antigos deve ser refeito no próximo login. */
  precisaRehash(hash: string): boolean {
    try {
      return argon2.needsRehash(hash, PARAMETROS_ARGON2);
    } catch {
      return false;
    }
  }

  async verificarFicticio(senha: string): Promise<false> {
    this.hashFicticio ??= this.hash(this.gerarTemporaria());
    await this.verificar(await this.hashFicticio, senha);
    return false;
  }

  /** Senha temporária forte para usuários criados por administrador. */
  gerarTemporaria(tamanho = 16): string {
    const alfabeto =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#%&*';
    let senha = '';
    for (let i = 0; i < tamanho; i++)
      senha += alfabeto[randomInt(alfabeto.length)];
    return senha;
  }
}
