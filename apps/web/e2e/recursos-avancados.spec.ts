import { expect, test } from '@playwright/test'
import { entrarAluno, entrarProfissional, SENHA, vigiarErros } from './apoio'

/** PNG mínimo válido (1×1) — a API reconhece a mídia pela assinatura do arquivo. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * Lote 6 no navegador: questão V/F com imagem, impressão da prova com/sem gabarito e
 * "Minha conta" (verificação em duas etapas e sessões). Usa os usuários do seed.
 */
test('questão verdadeiro/falso com imagem e impressão da prova', async ({ browser }) => {
  const erros: string[] = []
  const id = Date.now().toString(36)
  const prof = await entrarProfissional(browser, 'professor@quizzer.local', erros)

  await prof.goto('/app/questoes/nova')
  await prof.getByLabel('Disciplina').fill('Geografia')
  await prof.getByLabel('Formato').selectOption('VERDADEIRO_FALSO')
  await prof.getByLabel('Enunciado').fill(`A imagem mostra um pixel (${id}).`)
  await prof.getByLabel('Escolher imagens ou áudios').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: PNG_1X1 })
  await expect(prof.getByText('pixel.png')).toBeVisible()
  await prof.getByLabel('Verdadeira').check()
  await prof.getByRole('button', { name: 'Salvar rascunho' }).click()

  await expect(prof.getByText(/Verdadeiro ou falso/)).toBeVisible()
  const imagem = prof.getByRole('img', { name: /pixel\.png/ })
  await expect(imagem).toBeVisible()
  expect(await imagem.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1)
  // Limpeza: o rascunho de teste é arquivado
  await prof.getByRole('button', { name: 'Arquivar' }).click()
  await prof.getByRole('dialog').getByRole('button', { name: 'Arquivar' }).click() // confirmação
  await expect(prof.getByText('Arquivada').first()).toBeVisible()

  // Impressão de uma prova publicada do seed, com e sem gabarito
  await prof.goto('/app/provas')
  await prof.getByRole('link', { name: 'Avaliação Diagnóstica de Biologia' }).first().click()
  await prof.getByRole('link', { name: 'Imprimir / PDF' }).click()
  await expect(prof.getByRole('heading', { name: 'Avaliação Diagnóstica de Biologia' })).toBeVisible()
  await expect(prof.getByText(/Nome: _+/)).toBeVisible()
  await prof.getByLabel('Incluir gabarito e rubricas').check()
  await expect(prof.getByRole('heading', { name: /GABARITO/ })).toBeVisible()
  await expect(prof.getByText('(correta)').first()).toBeVisible()

  expect(erros).toEqual([])
})

test('minha conta: verificação em duas etapas opcional e sessões abertas', async ({ browser }) => {
  const erros: string[] = []
  const aluno = await entrarAluno(browser, 'aluno2@quizzer.local', erros, 1280)
  await aluno.goto('/aluno/conta')
  await expect(aluno.getByRole('heading', { name: 'Verificação em duas etapas' })).toBeVisible()
  await expect(aluno.getByText(/Opcional/)).toBeVisible()
  await aluno.getByRole('button', { name: 'Ativar verificação em duas etapas' }).click()
  await expect(aluno.getByRole('img', { name: /QR code/ })).toBeVisible()
  await aluno.getByRole('button', { name: 'Cancelar' }).click() // não ativa: mantém o seed como está

  await expect(aluno.getByRole('heading', { name: 'Sessões abertas' })).toBeVisible()
  await expect(aluno.getByText('esta sessão')).toBeVisible()
  expect(erros).toEqual([])
})

test('configurações: tema escuro segue para as outras telas e volta ao padrão do sistema', async ({ browser }) => {
  const erros: string[] = []
  const prof = await entrarProfissional(browser, 'professor@quizzer.local', erros)
  await prof.emulateMedia({ colorScheme: 'light' })
  await prof.goto('/app/conta')
  await prof.getByRole('tab', { name: 'Aparência' }).click()
  await expect(prof.getByRole('radio', { name: /Padrão do sistema/ })).toBeChecked()

  await prof.getByRole('radio', { name: /Escuro/ }).check()
  await expect(prof.locator('html')).toHaveAttribute('data-tema', 'escuro')
  await prof.reload() // public/tema.js reaplica antes do React
  await expect(prof.locator('html')).toHaveAttribute('data-tema', 'escuro')
  await expect(prof.locator('body')).toHaveCSS('background-color', 'rgb(18, 20, 27)')

  await prof.getByRole('tab', { name: 'Aparência' }).click()
  await prof.getByRole('radio', { name: /Padrão do sistema/ }).check()
  await expect(prof.locator('html')).not.toHaveAttribute('data-tema', /.+/)
  await prof.emulateMedia({ colorScheme: 'dark' }) // padrão do sistema acompanha o aparelho
  await expect(prof.locator('body')).toHaveCSS('background-color', 'rgb(18, 20, 27)')
  expect(erros).toEqual([])
})

test('termos: quem não aceitou a versão vigente passa pela página de aceite e volta para onde ia', async ({ browser }) => {
  const erros: string[] = []
  const aluno = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage()
  vigiarErros(aluno, erros)
  // Simula conta sem aceite sem mexer no seed: marca politicaPendente nas respostas de /auth até o aceite.
  let aceito = false
  let versaoEnviada: unknown
  await aluno.route('**/api/v1/auth/**', async (rota) => {
    const resposta = await rota.fetch()
    const corpo = await resposta.json().catch(() => null)
    if (aceito || !corpo) return rota.fulfill({ response: resposta })
    if (corpo.usuario) corpo.usuario.politicaPendente = true
    else if (corpo.papel) corpo.politicaPendente = true
    await rota.fulfill({ response: resposta, json: corpo })
  })
  await aluno.route('**/api/v1/minha-conta/politica/aceitar', async (rota) => {
    versaoEnviada = rota.request().postDataJSON()?.versao
    aceito = true
    await rota.fulfill({ json: { versao: versaoEnviada } })
  })

  // Os textos completos ficam públicos no rodapé do login.
  await aluno.goto('/aluno/login')
  await aluno.getByRole('link', { name: 'Termos de Uso' }).click()
  await expect(aluno.getByRole('heading', { name: 'Termos de Uso', level: 1 })).toBeVisible()
  await aluno.getByRole('link', { name: 'Política de Privacidade' }).click()
  await expect(aluno.getByRole('heading', { name: 'Política de Privacidade', level: 1 })).toBeVisible()

  await aluno.goto('/aluno/resultados')
  await aluno.getByLabel('E-mail ou matrícula').fill('aluno2@quizzer.local')
  await aluno.getByLabel('Senha').fill(SENHA)
  await aluno.getByRole('button', { name: 'Entrar' }).click()
  await expect(aluno).toHaveURL(/\/aluno\/aceite-termos$/)
  await expect(aluno.getByRole('heading', { name: 'Termos de Uso e Política de Privacidade' })).toBeVisible()
  await expect(aluno.getByRole('region', { name: 'Texto: Termos de Uso' })).toContainText('Conduta nas avaliações')
  await aluno.getByRole('tab', { name: 'Política de Privacidade' }).click()
  await expect(aluno.getByRole('region', { name: 'Texto: Política de Privacidade' })).toContainText('Seus direitos')

  const continuar = aluno.getByRole('button', { name: 'Aceitar e continuar' })
  await expect(continuar).toBeDisabled()
  await aluno.getByRole('checkbox', { name: /aceito os Termos de Uso/ }).check()
  await expect(continuar).toBeDisabled() // falta a ciência da política
  await aluno.getByRole('checkbox', { name: /Política de Privacidade/ }).check()
  await continuar.click()
  await expect(aluno).toHaveURL(/\/aluno\/resultados$/)
  expect(versaoEnviada).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(erros).toEqual([])
})

test('lote 7: questão com várias corretas e fórmula; relatório em Excel', async ({ browser }) => {
  const erros: string[] = []
  const id = Date.now().toString(36)
  const prof = await entrarProfissional(browser, 'professor@quizzer.local', erros)

  await prof.goto('/app/questoes/nova')
  await prof.getByLabel('Disciplina').fill('Matemática')
  await prof.getByLabel('Formato').selectOption('MULTIPLA_RESPOSTA')
  await prof.getByLabel('Enunciado').fill(`Quais são primos? \\(p > 1\\) (${id})`)
  // Pré-visualização da fórmula (MathML)
  await expect(prof.getByLabel('Pré-visualização do enunciado').locator('math')).toBeVisible()
  const textos = ['2', '4', '5', '9']
  for (const [i, t] of textos.entries()) await prof.getByLabel(`Texto da alternativa ${'ABCD'[i]}`).fill(t)
  await prof.getByLabel('Alternativa C é correta').check()
  await prof.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(prof.getByText(/Várias corretas/)).toBeVisible()
  await expect(prof.locator('.qz-alternativa--correta')).toHaveCount(2)
  await expect(prof.locator('.qz-formula math').first()).toBeVisible()
  await prof.getByRole('button', { name: 'Arquivar' }).click()
  await prof.getByRole('dialog').getByRole('button', { name: 'Arquivar' }).click() // confirmação
  await expect(prof.getByText('Arquivada').first()).toBeVisible()

  // Relatório em Excel de uma prova com notas (a lista só mostra provas corrigidas; a prova do
  // seed não tem notas próprias — as do teste de carga são apagadas pela limpeza)
  await prof.goto('/app/relatorios')
  await prof.getByRole('table', { name: 'Provas' }).getByRole('link').first().click()
  const [download] = await Promise.all([prof.waitForEvent('download'), prof.getByRole('button', { name: 'Excel' }).click()])
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  expect(erros).toEqual([])
})

test('lote 8: prova com seção de sorteio e questão de associação', async ({ browser }) => {
  const erros: string[] = []
  const id = Date.now().toString(36)
  const prof = await entrarProfissional(browser, 'professor@quizzer.local', erros)

  // Questão de associação (rascunho, arquivada no fim)
  await prof.goto('/app/questoes/nova')
  await prof.getByLabel('Disciplina').fill('Geografia')
  await prof.getByLabel('Formato').selectOption('ASSOCIACAO')
  await prof.getByLabel('Enunciado').fill(`Associe país e capital (${id}).`)
  await prof.getByLabel('Item 1 (coluna A)').fill('Brasil')
  await prof.getByLabel('Opção correta do item 1 (coluna B)').fill('Brasília')
  await prof.getByLabel('Item 2 (coluna A)').fill('Chile')
  await prof.getByLabel('Opção correta do item 2 (coluna B)').fill('Santiago')
  await prof.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(prof.getByText(/Associação de colunas/)).toBeVisible()
  await expect(prof.getByRole('cell', { name: 'Santiago' })).toBeVisible()
  await prof.getByRole('button', { name: 'Arquivar' }).click()
  await prof.getByRole('dialog').getByRole('button', { name: 'Arquivar' }).click() // confirmação
  await expect(prof.getByText('Arquivada').first()).toBeVisible()

  // Prova com uma seção fixa e uma de sorteio
  await prof.goto('/app/provas/nova')
  await prof.getByLabel('Título').fill(`Seções ${id}`)
  await prof.getByRole('button', { name: 'Salvar e escolher questões' }).click()
  await prof.getByLabel('Buscar no enunciado').fill('respiração celular')
  await prof.getByRole('row', { name: /respiração celular/ }).getByRole('button', { name: 'Adicionar' }).click()
  await prof.getByLabel('Peso da questão 1 da seção 1 (%)').fill('50')
  await prof.getByRole('button', { name: '+ Nova seção' }).click()
  await prof.getByLabel('Título da seção 2').fill('Sorteio')
  await prof.getByLabel('Modo').nth(1).selectOption('SORTEIO')
  await prof.getByLabel('Peso da seção (%)').fill('50')
  await prof.getByLabel('Buscar no enunciado').fill('')
  await prof.getByLabel('Disciplina').selectOption('Conhecimentos Gerais')
  await prof.getByRole('button', { name: /Adicionar todas desta página/ }).click()
  await expect(prof.getByText('Soma dos pesos: 100%')).toBeVisible()
  await expect(prof.getByText('2 questões por participante')).toBeVisible()
  await prof.getByRole('button', { name: 'Salvar e revisar' }).click()
  await expect(prof.getByText(/sorteio de 1 entre \d+ questões/)).toBeVisible()
  await expect(prof.getByText('Cada participante recebe 2 questões.')).toBeVisible()

  expect(erros).toEqual([])
})
