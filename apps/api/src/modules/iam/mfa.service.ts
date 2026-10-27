import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { cifrar, decifrar } from '../../common/crypto/cifra.js';
import type { Env } from '../../config/env.js';

export interface ResultadoVerificacaoTotp {
  valido: boolean;
  /** Time-step aceito — deve ser persistido para bloquear reuso do código. */
  passo?: number;
}

const ALFABETO_RECUPERACAO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Normaliza o código de recuperação digitado ("abcd-2345" → "ABCD2345"). */
export function normalizarCodigoRecuperacao(codigo: string): string {
  return codigo.replace(/[-\s]/g, '').toUpperCase();
}

export function hashCodigoRecuperacao(codigo: string): string {
  return createHash('sha256').update(`quizzer-mfa-recuperacao:${normalizarCodigoRecuperacao(codigo)}`).digest('hex');
}

/** 10 códigos de uso único (8 caracteres, ~39 bits cada) — mostrados uma vez (ADR-0042). */
export function gerarCodigosRecuperacao(quantidade = 10) {
  const codigos = Array.from({ length: quantidade }, () => {
    let c = '';
    for (let i = 0; i < 8; i++) c += ALFABETO_RECUPERACAO[randomInt(ALFABETO_RECUPERACAO.length)];
    return `${c.slice(0, 4)}-${c.slice(4)}`;
  });
  return { codigos, hashes: codigos.map(hashCodigoRecuperacao) };
}

/** TOTP (RFC 6238) compatível com Google Authenticator, Authy, etc. */
@Injectable()
export class MfaService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get chave(): string {
    return this.config.get('MFA_ENCRYPTION_KEY', { infer: true });
  }

  gerarSegredo(): string {
    return generateSecret();
  }

  cifrarSegredo(segredo: string): string {
    return cifrar(segredo, this.chave);
  }

  decifrarSegredo(segredoCifrado: string): string {
    return decifrar(segredoCifrado, this.chave);
  }

  async gerarDadosCadastro(segredo: string, email: string) {
    const otpauthUri = generateURI({
      issuer: this.config.get('MFA_ISSUER', { infer: true }),
      label: email,
      secret: segredo,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
      margin: 1,
      width: 240,
    });
    return { otpauthUri, qrCodeDataUrl, segredo };
  }

  /**
   * Aceita o código do passo atual e de ±1 passo (30 s) para tolerar relógio
   * levemente dessincronizado. `ultimoPasso` impede replay do mesmo código.
   */
  async verificarCodigo(
    segredo: string,
    codigo: string,
    ultimoPasso?: number | null,
  ): Promise<ResultadoVerificacaoTotp> {
    if (!/^\d{6}$/.test(codigo)) return { valido: false };
    const resultado = await verify({
      secret: segredo,
      token: codigo,
      epochTolerance: 30,
      ...(ultimoPasso != null ? { afterTimeStep: ultimoPasso } : {}),
    });
    // O tipo de retorno é união TOTP|HOTP; só o resultado TOTP traz `timeStep`.
    if (!resultado.valid || !('timeStep' in resultado))
      return { valido: false };
    return { valido: true, passo: resultado.timeStep };
  }
}
