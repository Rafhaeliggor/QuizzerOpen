import { expect, type Browser, type Page } from '@playwright/test'

export const SENHA = process.env.E2E_SENHA ?? ''
if (!SENHA) throw new Error('Defina E2E_SENHA com a senha do seed (SEED_SENHA_PADRAO).')

/**
 * Coleta erros de JavaScript e de console. Ignora o aviso genérico do navegador para
 * respostas 4xx ("Failed to load resource … status of 4xx"): os 4xx esperados (401 do
 * refresh sem sessão, 409 de duplicidade/sessão assumida) são verificados pela interface.
 */
const STATUS_4XX = /Failed to load resource: the server responded with a status of 4\d\d/

export function vigiarErros(page: Page, erros: string[]) {
  page.on('console', (m) => m.type() === 'error' && !STATUS_4XX.test(m.text()) && erros.push(m.text()))
  page.on('pageerror', (e) => erros.push(String(e)))
}

export async function entrarProfissional(browser: Browser, email: string, erros: string[]) {
  const page = await (await browser.newContext()).newPage()
  vigiarErros(page, erros)
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite),/ })).toBeVisible()
  return page
}

export async function entrarAluno(browser: Browser, login: string, erros: string[], largura = 390) {
  const page = await (await browser.newContext({ viewport: { width: largura, height: 860 } })).newPage()
  vigiarErros(page, erros)
  await page.goto('/aluno/login')
  await page.getByLabel('E-mail ou matrícula').fill(login)
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Minhas provas' })).toBeVisible()
  return page
}
