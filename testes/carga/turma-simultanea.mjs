#!/usr/bin/env node
/**
 * Teste de carga: uma turma inteira entra e faz a prova AO MESMO TEMPO, pela mesma rede
 * (mesmo IP — cenário de laboratório/campus atrás de NAT). Sem dependências: Node 24+.
 *
 *   node testes/carga/turma-simultanea.mjs --base http://127.0.0.1:8080 \
 *        --professor professor@quizzer.local --senha '...' --alunos 40
 *
 * Usa a prova publicada "Avaliação Diagnóstica de Biologia" do seed. Cria uma turma nova
 * com N alunos (via importação CSV), aplica a prova e dispara todos os alunos juntos:
 * login → troca da senha temporária → iniciar → abrir sessão → autosave de cada questão
 * (2 gravações por questão) → enviar. Mede latência por etapa e erros.
 */
import { parseArgs } from 'node:util'

const { values: opt } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://127.0.0.1:8080' },
    professor: { type: 'string', default: 'professor@quizzer.local' },
    senha: { type: 'string' },
    alunos: { type: 'string', default: '40' },
    prova: { type: 'string', default: 'Avaliação Diagnóstica de Biologia' },
  },
})
if (!opt.senha) {
  console.error('Informe --senha (senha da professora do seed).')
  process.exit(1)
}
const N = Number(opt.alunos)
const API = `${opt.base}/api/v1`
const metricas = new Map() // etapa -> [ms]
const erros = []

async function chamar(etapa, caminho, { token, metodo = 'GET', corpo, cabecalhos = {} } = {}) {
  const inicio = performance.now()
  const res = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...cabecalhos,
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const ms = performance.now() - inicio
  if (etapa) metricas.set(etapa, [...(metricas.get(etapa) ?? []), ms])
  const texto = await res.text()
  const dados = texto ? JSON.parse(texto) : undefined
  if (!res.ok) throw new Error(`${etapa ?? caminho}: HTTP ${res.status} ${dados?.message ?? ''}`)
  return dados
}

function percentil(lista, p) {
  const o = [...lista].sort((a, b) => a - b)
  return o[Math.min(o.length - 1, Math.ceil((p / 100) * o.length) - 1)] ?? 0
}

// ------------------------------------------------------------------ preparação
console.log(`Preparando turma com ${N} alunos em ${opt.base}…`)
const prof = await chamar(null, '/auth/profissional/login', {
  metodo: 'POST',
  corpo: { email: opt.professor, senha: opt.senha },
})
if (prof.status !== 'AUTENTICADO') throw new Error(`Login da professora retornou ${prof.status}`)
const tp = prof.accessToken
const sufixo = Date.now().toString(36)
const turma = await chamar(null, '/turmas', {
  token: tp,
  metodo: 'POST',
  corpo: { nome: `Carga ${sufixo}`, periodoInicio: '2026-01-01', periodoFim: '2026-12-31' },
})
const csv = ['nome,email', ...Array.from({ length: N }, (_, i) => `Aluno Carga ${i + 1},carga.${sufixo}.${i}@quizzer.local`)].join('\n')
const imp = await chamar(null, `/turmas/${turma.id}/importacao`, { token: tp, metodo: 'POST', corpo: { conteudo: csv } })
if (imp.criados.length !== N) throw new Error(`Importação criou ${imp.criados.length} de ${N}`)
const provas = await chamar(null, '/provas?status=PUBLICADA', { token: tp })
const prova = provas.find((p) => p.titulo === opt.prova)
if (!prova) throw new Error(`Prova "${opt.prova}" não encontrada`)
const agora = Date.now()
const aplicacao = await chamar(null, '/aplicacoes', {
  token: tp,
  metodo: 'POST',
  corpo: {
    provaId: prova.id,
    destinoTipo: 'TURMA',
    turmaId: turma.id,
    janelaInicio: new Date(agora - 60_000).toISOString(),
    janelaFim: new Date(agora + 2 * 3600_000).toISOString(),
  },
})

// ------------------------------------------------------------------ carga
async function aluno({ email, senhaTemporaria }, i) {
  const login = await chamar('1. login', '/auth/aluno/login', { metodo: 'POST', corpo: { login: email, senha: senhaTemporaria } })
  const troca = await chamar('2. troca de senha', '/auth/senha', {
    token: login.accessToken,
    metodo: 'POST',
    corpo: { senhaAtual: senhaTemporaria, novaSenha: `NovaSenha${i}x2026` },
  })
  const t = troca.accessToken
  await chamar('3. listar provas', '/aluno/aplicacoes', { token: t })
  const { tentativaId } = await chamar('4. iniciar', `/aluno/aplicacoes/${aplicacao.id}/iniciar`, { token: t, metodo: 'POST' })
  const exec = await chamar('5. carregar prova', `/aluno/tentativas/${tentativaId}`, { token: t })
  const { sessaoExecucao } = await chamar('6. abrir sessão', `/aluno/tentativas/${tentativaId}/sessao`, { token: t, metodo: 'POST' })
  const cab = { 'X-Sessao-Execucao': sessaoExecucao }
  for (const q of exec.questoes) {
    for (let k = 0; k < 2; k++) {
      const valor =
        q.natureza === 'FECHADA'
          ? { alternativaId: q.alternativas[(i + k) % q.alternativas.length].id }
          : { texto: `Resposta do aluno ${i}, rascunho ${k}. O ATP armazena e transfere energia.` }
      await chamar('7. autosave', `/aluno/tentativas/${tentativaId}/respostas/${q.versaoQuestaoId}`, {
        token: t,
        metodo: 'PUT',
        corpo: valor,
        cabecalhos: cab,
      })
    }
  }
  await chamar('8. enviar', `/aluno/tentativas/${tentativaId}/enviar`, { token: t, metodo: 'POST', cabecalhos: cab })
}

console.log(`Disparando ${N} alunos simultâneos…`)
const inicio = performance.now()
const resultados = await Promise.allSettled(imp.criados.map((c, i) => aluno(c, i)))
const totalS = (performance.now() - inicio) / 1000
for (const r of resultados) if (r.status === 'rejected') erros.push(String(r.reason?.message ?? r.reason))

// ------------------------------------------------------------------ relatório
const linhas = [...metricas.entries()].map(([etapa, l]) => ({
  etapa,
  req: l.length,
  p50: Math.round(percentil(l, 50)),
  p95: Math.round(percentil(l, 95)),
  max: Math.round(Math.max(...l)),
}))
const totalReq = linhas.reduce((s, l) => s + l.req, 0)
console.log(`\nAlunos: ${N} · concluíram: ${N - erros.length} · falharam: ${erros.length}`)
console.log(`Tempo total: ${totalS.toFixed(1)} s · requisições: ${totalReq} · vazão média: ${(totalReq / totalS).toFixed(1)} req/s\n`)
console.log('| Etapa | Req. | p50 (ms) | p95 (ms) | máx. (ms) |')
console.log('|---|---|---|---|---|')
for (const l of linhas) console.log(`| ${l.etapa} | ${l.req} | ${l.p50} | ${l.p95} | ${l.max} |`)
if (erros.length) {
  console.log('\nErros (primeiros 10):')
  for (const e of erros.slice(0, 10)) console.log(' -', e)
}
console.log(`\nAplicação de teste: ${aplicacao.id} (turma "Carga ${sufixo}")`)
process.exitCode = erros.length ? 1 : 0
