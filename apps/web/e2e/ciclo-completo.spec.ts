import { expect, test } from '@playwright/test'
import { entrarAluno, entrarProfissional, SENHA, vigiarErros } from './apoio'

/**
 * Ciclo completo do MVP no navegador (Questão → Prova → Aplicação → Execução → Correção →
 * Recurso → Relatório) + prova pública por PIN + sessão única. Usa os usuários do seed.
 */
test('ciclo completo de uma avaliação', async ({ browser }) => {
  const erros: string[] = []
  const id = Date.now().toString(36)
  const enunciado = `Descreva a diferença entre mitose e meiose (${id}).`
  const tituloProva = `Mini teste ${id}`

  // 1. Professora cria questão aberta e envia para revisão
  const prof = await entrarProfissional(browser, 'professor@quizzer.local', erros)
  await prof.goto('/app/questoes/nova')
  await expect(prof.getByRole('heading', { name: 'Nova questão' })).toBeVisible()
  await prof.getByLabel('Disciplina').fill('Biologia')
  await prof.getByLabel('Formato').selectOption('DISSERTATIVA')
  await prof.getByLabel('Enunciado').fill(enunciado)
  await prof.getByLabel(/Rubrica/).fill('Divisões, células-filhas e variabilidade.')
  await prof.getByRole('button', { name: 'Salvar rascunho' }).click()
  await prof.getByRole('button', { name: 'Enviar para revisão' }).click()
  // Execuções anteriores deixam questões parecidas: o alerta de duplicidade (RF04) é esperado.
  const emRevisao = prof.getByText('Aguardando revisão de outro professor')
  const naoDuplicada = prof.getByRole('button', { name: 'Não é duplicada — enviar' })
  await expect(emRevisao.or(naoDuplicada)).toBeVisible()
  if (await naoDuplicada.isVisible()) await naoDuplicada.click()
  await expect(emRevisao).toBeVisible()

  // 2. Revisor aprova (dupla checagem)
  const rev = await entrarProfissional(browser, 'revisor@quizzer.local', erros)
  await rev.goto('/app/questoes')
  await rev.getByRole('tab', { name: 'Aguardando minha revisão' }).click()
  await rev.getByRole('link', { name: new RegExp(id) }).click()
  await rev.getByRole('button', { name: 'Aprovar e publicar' }).click()
  await expect(rev.getByText('Publicada').first()).toBeVisible()

  // 3. Prova pelo assistente, publicação e aplicação à turma
  await prof.goto('/app/provas/nova')
  await expect(prof.getByRole('heading', { name: 'Nova prova' })).toBeVisible()
  await prof.getByLabel('Título').fill(tituloProva)
  await prof.getByLabel('Tempo limite (minutos)').fill('20')
  await prof.getByRole('button', { name: 'Salvar e escolher questões' }).click()
  await prof.getByLabel('Buscar no enunciado').fill('respiração celular')
  await prof.getByRole('row', { name: /respiração celular/ }).getByRole('button', { name: 'Adicionar' }).click()
  await prof.getByLabel('Buscar no enunciado').fill(id)
  await prof.getByRole('row', { name: new RegExp(id) }).getByRole('button', { name: 'Adicionar' }).click()
  // Desde a montagem por seções (lote 8) a questão entra com peso 0: distribui antes de conferir a soma
  await prof.getByRole('button', { name: 'Distribuir igualmente' }).click()
  await expect(prof.getByText('Soma dos pesos: 100%')).toBeVisible()
  await prof.getByRole('button', { name: 'Salvar e revisar' }).click()
  await prof.getByRole('button', { name: 'Publicar prova' }).click()
  await prof.getByRole('button', { name: 'Aplicar prova' }).click()
  // Turma do seed explícita: a primeira da lista depende das turmas que outros testes criaram
  const seletorTurma = prof.getByLabel('Turma', { exact: true })
  const piloto = await seletorTurma.locator('option', { hasText: 'Turma Piloto 2026.2' }).getAttribute('value')
  await seletorTurma.selectOption(piloto!)
  await prof.getByRole('button', { name: 'Criar aplicação' }).click()
  await expect(prof.getByRole('columnheader', { name: 'Participante' })).toBeVisible()

  // 4. Aluno (celular) faz a prova; recarregar não perde respostas
  const aluno = await entrarAluno(browser, '2026000001', erros)
  const cartao = aluno.locator('.qz-cartao-prova', { hasText: tituloProva })
  await cartao.getByRole('button', { name: 'Iniciar prova' }).click()
  await aluno.getByRole('button', { name: 'Iniciar agora' }).click()
  await aluno.getByLabel(/Mitocôndria/).check()
  await expect(aluno.getByText('Resposta salva ✓')).toBeVisible()
  await aluno.reload()
  await expect(aluno.getByLabel(/Mitocôndria/)).toBeChecked()
  await aluno.getByRole('button', { name: 'Próxima →' }).click()
  await aluno.getByLabel('Sua resposta').fill('A mitose gera duas células iguais; a meiose gera quatro com metade dos cromossomos.')
  await expect(aluno.getByText('Resposta salva ✓')).toBeVisible()

  // 4b. Sessão única: abrir a mesma prova em outra aba assume; a aba antiga é bloqueada
  const urlProva = aluno.url()
  const outraAba = await aluno.context().newPage()
  vigiarErros(outraAba, erros)
  await outraAba.goto(urlProva)
  await expect(outraAba.getByRole('timer')).toBeVisible()
  // A próxima gravação da aba antiga (ao sair do campo de texto ou ao marcar outra
  // alternativa) recebe 409 e a tela de sessão substituída aparece.
  // O 409 pode chegar a qualquer momento (blur do campo de texto), então nada aqui pode
  // depender de o rádio ainda existir: clique tolerante + espera pela tela de substituição.
  await aluno.getByRole('button', { name: '← Anterior' }).click()
  const substituida = aluno.getByText('Prova aberta em outro lugar')
  await expect(aluno.getByRole('heading', { name: 'Questão 1 de 2' }).or(substituida)).toBeVisible()
  if (!(await substituida.isVisible())) {
    await aluno.getByLabel(/Ribossomo/).click({ timeout: 5_000 }).catch(() => undefined)
  }
  await expect(substituida).toBeVisible()
  await outraAba.close()
  await aluno.getByRole('button', { name: 'Continuar neste dispositivo' }).click()
  await expect(aluno.getByLabel(/Mitocôndria/)).toBeChecked() // a resposta da aba antiga não foi gravada

  await aluno.getByRole('button', { name: 'Enviar prova' }).click()
  await aluno.getByRole('button', { name: 'Enviar definitivamente' }).click()
  await expect(aluno.getByText('Código do comprovante')).toBeVisible()

  // 5. Correção manual consolida a nota
  await prof.goto('/app/correcoes')
  await prof.getByRole('row', { name: new RegExp(tituloProva) }).getByRole('link', { name: 'Corrigir' }).click()
  await prof.getByRole('button', { name: '50%' }).click()
  await prof.getByLabel(/Feedback/).fill('Faltou citar a variabilidade genética.')
  // "Salvar e avançar" (feature 037): sem outra questão pendente aqui, sai para a próxima da fila
  const urlCorrecao = prof.url()
  await prof.getByRole('button', { name: 'Salvar e avançar' }).click()
  await expect(prof).not.toHaveURL(urlCorrecao)
  await expect(prof).toHaveURL(/\/app\/correcoes/)

  // 6. Aluno vê o resultado e contesta
  await aluno.goto('/aluno/resultados')
  await aluno.getByRole('link', { name: tituloProva }).first().click()
  await expect(aluno.getByText('Faltou citar a variabilidade')).toBeVisible()
  await aluno.getByRole('button', { name: 'Contestar esta questão' }).nth(1).click()
  await aluno.getByLabel(/Explique por que/).fill('Citei a redução cromossômica, que gera variabilidade.')
  await aluno.getByRole('button', { name: 'Enviar recurso' }).click()
  await expect(aluno.getByText('Aberto')).toBeVisible()

  // 7. Professora defere com ajuste individual
  await prof.goto('/app/recursos')
  await prof.getByRole('row', { name: new RegExp(tituloProva) }).getByRole('link').first().click()
  await prof.getByLabel('Resultado').selectOption('AJUSTE')
  await prof.getByLabel(/Nova pontuação/).fill('100')
  await prof.getByLabel(/Justificativa da decisão/).fill('Argumento procedente.')
  await prof.getByRole('button', { name: 'Registrar decisão' }).click()
  await expect(prof.getByText(/Decidido em/)).toBeVisible() // só existe depois de a decisão ser gravada
  await expect(prof.getByText('Impacto na pontuação')).toBeVisible()

  // 8. Relatório e exportação CSV
  await prof.goto('/app/relatorios')
  await prof.getByRole('link', { name: tituloProva }).click()
  await expect(prof.getByRole('heading', { name: 'Distribuição das notas' })).toBeVisible()
  const [download] = await Promise.all([prof.waitForEvent('download'), prof.getByRole('button', { name: 'Exportar CSV' }).click()])
  expect(download.suggestedFilename()).toMatch(/\.csv$/)
  // "Limpar período" remove as duas datas de uma vez (antes a data inicial ficava aplicada)
  await prof.getByLabel('Período: data inicial').fill('2020-01-01')
  await prof.getByLabel('Período: data final').fill('2099-12-31')
  await expect(prof).toHaveURL(/de=2020-01-01.*ate=2099-12-31/)
  await prof.getByRole('button', { name: 'Limpar período' }).click()
  await expect(prof).not.toHaveURL(/[?&](de|ate)=/)
  await expect(prof.getByText('Todo o período')).toBeVisible()

  // 9. Notificação do aluno — lista e "marcar todas como lidas"
  await aluno.goto('/aluno')
  await aluno.getByRole('button', { name: /Notificações/ }).click()
  await expect(aluno.getByText('Recurso deferido').first()).toBeVisible()
  await aluno.getByRole('button', { name: 'Marcar todas como lidas' }).click()
  await expect(aluno.getByRole('button', { name: 'Notificações', exact: true })).toBeVisible() // contador zerado

  expect(erros).toEqual([])
})

test('prova pública por PIN', async ({ browser, request }) => {
  const erros: string[] = []
  // Descobre o PIN do quiz público do seed pela API, como a professora.
  const login = await request.post('/api/v1/auth/profissional/login', { data: { email: 'professor@quizzer.local', senha: SENHA } })
  const { accessToken } = await login.json()
  const aplicacoes: { pinAcesso: string | null; situacao: string }[] = await (
    await request.get('/api/v1/aplicacoes', { headers: { Authorization: `Bearer ${accessToken}` } })
  ).json()
  const pin = aplicacoes.find((a) => a.pinAcesso && a.situacao === 'DISPONIVEL')?.pinAcesso
  expect(pin, 'seed deve criar um quiz público disponível').toBeTruthy()

  const page = await (await browser.newContext()).newPage()
  vigiarErros(page, erros)
  await page.goto('/p')
  await page.getByLabel('Código de acesso').fill(pin!)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Seu nome').fill('Visitante E2E')
  await page.getByLabel('Seu e-mail').fill(`visitante.${Date.now()}@exemplo.com`)
  await page.getByRole('button', { name: 'Iniciar prova' }).click()
  await expect(page.getByRole('timer')).toBeVisible() // espera a tela de execução antes de contar
  const total = await page.locator('.qz-mapa button').count()
  expect(total).toBeGreaterThan(0)
  for (let i = 0; i < total; i++) {
    await page.locator('.qz-opcao').first().click()
    await expect(page.getByText('Resposta salva ✓')).toBeVisible()
    if (i < total - 1) await page.getByRole('button', { name: 'Próxima →' }).click()
  }
  await page.getByRole('button', { name: 'Revisar e enviar' }).click()
  await page.getByRole('button', { name: 'Enviar definitivamente' }).click()
  await expect(page.getByText('Código do comprovante')).toBeVisible()
  await expect(page.getByText('resultado não certificado')).toBeVisible()
  expect(erros).toEqual([])
})
