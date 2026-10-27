import { defineConfig, devices } from '@playwright/test'

/**
 * Testes de navegador contra a stack completa (Nginx + API + Postgres + Redis) já no ar
 * e com o seed aplicado. Não sobem servidor sozinhos.
 *
 *   E2E_BASE_URL=http://127.0.0.1:8080 E2E_SENHA=<SEED_SENHA_PADRAO> npm run test:navegador -w @quizzer/web
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8080',
    // Para testar o modo HTTPS autoassinado (infra/tls/gerar-autoassinado.sh).
    ignoreHTTPSErrors: process.env.E2E_IGNORAR_CERTIFICADO === 'true',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
