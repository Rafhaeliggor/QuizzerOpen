import { ExecutionContext, SetMetadata } from '@nestjs/common';
import type { ThrottlerOptions } from '@nestjs/throttler';
import { createHash } from 'node:crypto';

/**
 * Estratégia de rate limit (ver docs/adr/0011-rate-limit-por-ip-e-identificador.md).
 *
 * Turmas inteiras acessam a partir da mesma rede (mesmo IP público via NAT),
 * então limite estrito por IP derrubaria uma aplicação de prova legítima.
 * - `default`: por IP, folgado — só contém flood/abuso grosseiro.
 * - `pin`: rotas públicas de acesso por PIN, 30/min por IP.
 * - `credenciais`: só nas rotas marcadas com @RotaCredencial, por IP + identificador
 *   (e-mail/matrícula/token) — contém força bruta sem afetar colegas na mesma rede.
 *   A proteção por conta é o bloqueio após N falhas (AuthService).
 */
export const CHAVE_ROTA_CREDENCIAL = 'throttle:rota-credencial';

export const RotaCredencial = () => SetMetadata(CHAVE_ROTA_CREDENCIAL, true);

/**
 * Rotas públicas que recebem PIN de prova: limitadas só por IP (o "identificador"
 * aqui é o próprio segredo adivinhado). Contém força bruta de códigos de acesso.
 */
export const CHAVE_ROTA_PIN = 'throttle:rota-pin';
export const RotaPin = () => SetMetadata(CHAVE_ROTA_PIN, true);

/**
 * Rotas de execução da prova (autosave, eventos, envio): fora do limite por IP (turma no mesmo
 * IP), mas com teto por SESSÃO — hash do Authorization — para conter cliente descontrolado.
 */
export const CHAVE_ROTA_EXECUCAO = 'throttle:rota-execucao';
export const RotaExecucao = () => SetMetadata(CHAVE_ROTA_EXECUCAO, true);

function ehRotaExecucao(ctx: ExecutionContext): boolean {
  return Reflect.getMetadata(CHAVE_ROTA_EXECUCAO, ctx.getHandler()) === true;
}

function ehRotaPin(ctx: ExecutionContext): boolean {
  return Reflect.getMetadata(CHAVE_ROTA_PIN, ctx.getHandler()) === true;
}

function ehRotaCredencial(ctx: ExecutionContext): boolean {
  return Reflect.getMetadata(CHAVE_ROTA_CREDENCIAL, ctx.getHandler()) === true;
}

export function identificadorCredencial(req: Record<string, unknown>): string {
  const corpo = (req.body ?? {}) as Record<string, unknown>;
  const headers = (req.headers ?? {}) as Record<string, unknown>;
  const bruto = [
    corpo.email,
    corpo.login,
    corpo.mfaToken,
    headers.authorization,
  ].find((v): v is string => typeof v === 'string' && v.length > 0);
  const normalizado = (bruto ?? '').trim().toLowerCase();
  return createHash('sha256').update(normalizado).digest('hex').slice(0, 32);
}

export function configurarThrottlers(
  limitePorIp: number,
  limiteCredenciais: number,
): ThrottlerOptions[] {
  return [
    { name: 'default', ttl: 60_000, limit: limitePorIp },
    {
      name: 'credenciais',
      ttl: 60_000,
      limit: limiteCredenciais,
      skipIf: (ctx) => !ehRotaCredencial(ctx),
      getTracker: (req) => `${String(req.ip)}|${identificadorCredencial(req)}`,
    },
    {
      name: 'execucao',
      ttl: 60_000,
      limit: 300,
      skipIf: (ctx) => !ehRotaExecucao(ctx),
      getTracker: (req) => {
        const auth = (req.headers as Record<string, unknown> | undefined)?.authorization;
        return `exec|${createHash('sha256').update(typeof auth === 'string' ? auth : String(req.ip)).digest('hex').slice(0, 32)}`;
      },
    },
    {
      name: 'pin',
      ttl: 60_000,
      limit: 30,
      skipIf: (ctx) => !ehRotaPin(ctx),
      getTracker: (req) => String(req.ip),
    },
  ];
}
