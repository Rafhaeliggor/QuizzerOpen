import { z } from 'zod';
import { fusoValido } from '../common/fuso/fuso.js';

/**
 * Variáveis de ambiente validadas no boot. A aplicação NÃO sobe se faltar
 * algum segredo ou se algum valor for inválido — nenhum segredo tem valor
 * padrão no código (ver docs/adr/0010-configuracao-e-segredos.md).
 */
const booleano = z.enum(['true', 'false']).transform((v) => v === 'true');

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),

  /** Segredo HMAC dos JWTs. Mínimo de 32 caracteres. */
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SEG: z.coerce.number().int().positive().default(900),
  JWT_MFA_TTL_SEG: z.coerce.number().int().positive().default(300),
  REFRESH_TTL_DIAS: z.coerce.number().int().positive().default(7),

  /** Chave AES-256 (32 bytes em base64) para cifrar segredos TOTP em repouso. */
  MFA_ENCRYPTION_KEY: z
    .string()
    .refine(
      (v) => Buffer.from(v, 'base64').length === 32,
      'deve ter 32 bytes em base64',
    ),
  MFA_ISSUER: z.string().default('Quizzer'),

  /** Requisições/min por IP (folgado: turmas inteiras compartilham IP via NAT). */
  RATE_LIMIT_POR_IP: z.coerce.number().int().positive().default(600),
  /** Requisições/min por IP + identificador nas rotas de credencial. */
  RATE_LIMIT_CREDENCIAIS: z.coerce.number().int().positive().default(10),

  /** Pasta das mídias das questões (volume no Docker). */
  MIDIAS_DIR: z.string().default('./dados/midias'),
  /** Tamanho máximo de cada mídia, em MB. */
  MIDIAS_MAX_MB: z.coerce.number().positive().default(5),

  /**
   * E-mail (opcional — ADR-0041). Sem SMTP_HOST o envio fica desligado e o sistema funciona
   * como antes (senhas temporárias exibidas ao administrador). `memoria` só para testes.
   */
  EMAIL_TRANSPORTE: z.enum(['smtp', 'memoria', 'desligado']).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORTA: z.coerce.number().int().positive().default(587),
  /** true = TLS direto (porta 465); false = STARTTLS quando o servidor oferecer. */
  SMTP_SEGURO: booleano.default(false),
  SMTP_USUARIO: z.string().optional(),
  SMTP_SENHA: z.string().optional(),
  EMAIL_REMETENTE: z.string().default('Quizzer <nao-responda@quizzer.local>'),
  /** Endereço público do sistema, usado nos links dos e-mails (ex.: https://provas.instituicao.edu.br). */
  APP_URL: z.url().default('http://localhost:5173'),
  /** Versão vigente da política de privacidade; mudar pede nova ciência de todos (LGPD). */
  POLITICA_VERSAO: z.string().default('2026-10-27'),

  /**
   * Retenção (LGPD — lote 8): dias após a prova em que os dados de participantes EXTERNOS (prova
   * pública, sem conta) são anonimizados automaticamente. 0 = desligado (decisão da instituição).
   */
  RETENCAO_EXTERNOS_DIAS: z.coerce.number().int().min(0).default(0),
  /** Notificações já lidas são apagadas depois de tantos dias (0 = nunca). */
  NOTIFICACOES_RETENCAO_DIAS: z.coerce.number().int().min(0).default(180),

  LOGIN_MAX_TENTATIVAS: z.coerce.number().int().positive().default(5),
  LOGIN_BLOQUEIO_MIN: z.coerce.number().int().positive().default(15),

  /**
   * Acesso servido via HTTPS. Liga cookies `Secure`, HSTS e upgrade-insecure-requests.
   * Só deve ser false enquanto o acesso for HTTP puro por IP (sem DNS/TLS — ver ADR-0008).
   */
  TLS_ATIVO: booleano.default(true),
  /** Acrescenta "preload" ao HSTS — só para domínio próprio registrável (ADR-0055). */
  HSTS_PRELOAD: booleano.default(false),
  /** Fuso horário da instituição (nome IANA) para datas sem hora e mensagens — ADR-0058. */
  FUSO_HORARIO: z.string().default('America/Maceio').refine(fusoValido, 'fuso horário IANA inválido (ex.: America/Maceio)'),
  /** Número de proxies reversos à frente da API (Nginx = 1). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
});

export type Env = z.infer<typeof envSchema>;

export function validarEnv(config: Record<string, unknown>): Env {
  const resultado = envSchema.safeParse(config);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${problemas}`);
  }
  return resultado.data;
}
