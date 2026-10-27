import { defineConfig } from 'vitest/config';

/**
 * Testes e2e: sobem o AppModule completo contra um Postgres/Redis reais.
 * Usam um banco separado (quizzer_test) — nunca o banco de desenvolvimento.
 * Os segredos abaixo são exclusivos de teste.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'fatal',
      DATABASE_URL:
        process.env.DATABASE_URL_TEST ?? 'postgresql://quizzer:quizzer_dev@127.0.0.1:5432/quizzer_test',
      REDIS_URL: process.env.REDIS_URL_TEST ?? 'redis://127.0.0.1:6379/1',
      JWT_ACCESS_SECRET: 'segredo-exclusivo-de-teste-e2e-nao-usar-em-producao',
      MFA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      TLS_ATIVO: 'false',
      TRUST_PROXY: '0',
      LOGIN_MAX_TENTATIVAS: '3',
      LOGIN_BLOQUEIO_MIN: '15',
      // Mídias de teste fora do repositório (apagadas pelo SO); nunca a pasta de desenvolvimento.
      MIDIAS_DIR: `${process.env.TMPDIR ?? '/tmp'}/quizzer-midias-e2e`,
      // E-mail em memória: os testes leem a "caixa de saída" (ADR-0041).
      EMAIL_TRANSPORTE: 'memoria',
      APP_URL: 'https://quizzer.teste',
    },
  },
});
