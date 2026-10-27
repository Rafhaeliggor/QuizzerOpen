import { expect, test } from '@playwright/test'
import { entrarAluno, entrarProfissional } from './apoio'

/**
 * Telas que não tinham teste de navegador (revisão de 2026-10-26): turmas com importação CSV,
 * acompanhamento de aplicação, filtros do banco de questões e a parte LGPD de "Minha conta" — com
 * digitação tecla a tecla dentro de diálogo (BUG-058: o campo perdia o foco a cada letra).
 */
test('turmas: cria, importa CSV e lista; aplicações: acompanhamento; questões: filtros', async ({ browser }) => {
  const erros: string[] = []
  const id = Date.now().toString(36)
  const prof = await entrarProfissional(browser, 'professor@quizzer.local', erros)

  // Turma nova
  await prof.goto('/app/turmas')
  await prof.getByRole('button', { name: /Nova turma/ }).click()
  await prof.getByLabel('Nome').fill(`Turma E2E ${id}`)
  await prof.getByLabel('Início do período').fill('2026-08-01')
  await prof.getByLabel('Fim do período').fill('2026-12-20')
  await prof.getByRole('button', { name: 'Criar turma' }).click()
  await expect(prof.getByRole('heading', { name: `Turma E2E ${id}` })).toBeVisible()

  // Importação CSV só com alunos do seed (não cria contas novas) e uma linha com erro
  await prof.getByRole('button', { name: /Importar alunos/ }).click()
  await prof.getByLabel('Arquivo CSV').setInputFiles({
    name: 'alunos.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('nome;email\nBruno Lima;aluno@quizzer.local\nCamila Torres;aluno2@quizzer.local\nSem e-mail;\n'),
  })
  await expect(prof.getByText('Pré-visualização de alunos.csv')).toBeVisible()
  await prof.getByRole('button', { name: 'Importar alunos', exact: true }).first().click() // o do painel (o da barra vem depois)
  await expect(prof.getByText(/3 linha\(s\) lidas · 2 matriculado\(s\) · 0 já estavam na turma · 0 conta\(s\) nova\(s\) · 1 com erro/)).toBeVisible()
  await expect(prof.getByRole('table', { name: 'Alunos matriculados' }).getByRole('row')).toHaveCount(3) // cabeçalho + 2

  // Acompanhamento de uma aplicação existente
  await prof.goto('/app/aplicacoes')
  await prof.getByRole('link', { name: 'Acompanhar' }).first().click()
  await expect(prof.getByText('Participantes').first()).toBeVisible()
  await expect(prof.getByText('Em andamento').first()).toBeVisible()

  // Banco de questões: filtros por tipo e dificuldade (feature 037)
  await prof.goto('/app/questoes')
  await prof.getByLabel('Tipo').selectOption('DISSERTATIVA')
  await expect(prof.getByRole('button', { name: 'Remover filtro de tipo' })).toBeVisible()
  await prof.getByLabel('Dificuldade').selectOption('DIFICIL')
  await expect(prof.getByRole('button', { name: 'Remover filtro de dificuldade' })).toBeVisible()
  await expect(prof.getByText(/questão encontrada|questões encontradas/)).toBeVisible()
  await prof.getByRole('button', { name: 'Remover filtro de tipo' }).click()
  await expect(prof.getByRole('button', { name: 'Remover filtro de tipo' })).toHaveCount(0)
  expect(erros).toEqual([])
})

test('minha conta (aluno): exporta os dados e digita o motivo da exclusão tecla a tecla', async ({ browser }) => {
  const erros: string[] = []
  const aluno = await entrarAluno(browser, 'aluno2@quizzer.local', erros, 1280)
  await aluno.goto('/aluno/conta')
  await aluno.getByRole('tab', { name: 'Privacidade e dados' }).click()

  const [download] = await Promise.all([aluno.waitForEvent('download'), aluno.getByRole('button', { name: /Baixar meus dados/ }).click()])
  expect(download.suggestedFilename()).toMatch(/\.json$/)

  const excluir = aluno.getByRole('button', { name: 'Solicitar exclusão dos meus dados' })
  if (await excluir.isEnabled()) {
    await excluir.click()
    const motivo = aluno.getByRole('dialog').getByLabel('Motivo (opcional)')
    await motivo.click()
    await motivo.pressSequentially('Não uso mais o sistema') // uma tecla por vez, como uma pessoa
    await expect(motivo).toHaveValue('Não uso mais o sistema')
    await expect(motivo).toBeFocused()
    await aluno.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click() // não cria solicitação
    await expect(aluno.getByRole('dialog')).toHaveCount(0)
  }
  expect(erros).toEqual([])
})
