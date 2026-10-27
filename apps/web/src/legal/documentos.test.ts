// O teste lê e grava docs/legal/ — único arquivo do app que usa APIs do Node.
/// <reference types="node" />
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DOCUMENTOS_LEGAIS, paraMarkdown, preencher, VERSAO_DOCUMENTOS_LEGAIS } from './documentos'

/**
 * Cópia sincronizada em docs/legal/ (ADR-0060). `npm run legal:sincronizar` (SINCRONIZAR_LEGAL=1)
 * regrava os arquivos; sem a variável, o teste falha se a cópia estiver desatualizada.
 */
const RAIZ = resolve(__dirname, '../../../..')
const caminhoDoc = (slug: string) => resolve(RAIZ, 'docs/legal', `${slug}.md`)

describe('documentos legais', () => {
  it.each(DOCUMENTOS_LEGAIS.map((d) => [d.slug, d] as const))('docs/legal/%s.md está sincronizado com o app', (_, doc) => {
    const esperado = paraMarkdown(doc)
    if (process.env.SINCRONIZAR_LEGAL) writeFileSync(caminhoDoc(doc.slug), esperado)
    expect(existsSync(caminhoDoc(doc.slug)), `rode npm run legal:sincronizar -w @quizzer/web`).toBe(true)
    expect(readFileSync(caminhoDoc(doc.slug), 'utf8'), 'cópia em docs/legal desatualizada: rode npm run legal:sincronizar -w @quizzer/web').toBe(esperado)
  })

  it('a versão dos textos é a mesma POLITICA_VERSAO padrão da API, do compose e do .env.example', () => {
    const ler = (p: string) => readFileSync(resolve(RAIZ, p), 'utf8')
    expect(ler('apps/api/src/config/env.ts')).toContain(`POLITICA_VERSAO: z.string().default('${VERSAO_DOCUMENTOS_LEGAIS}')`)
    expect(ler('docker-compose.yml')).toContain(`POLITICA_VERSAO: \${POLITICA_VERSAO:-${VERSAO_DOCUMENTOS_LEGAIS}}`)
    expect(ler('.env.example')).toContain(`POLITICA_VERSAO=${VERSAO_DOCUMENTOS_LEGAIS}`)
    expect(ler('apps/api/prisma/seed.ts')).toContain(`process.env.POLITICA_VERSAO ?? '${VERSAO_DOCUMENTOS_LEGAIS}'`)
  })

  it('só usa os marcadores conhecidos', () => {
    const textos = DOCUMENTOS_LEGAIS.flatMap((d) => [d.resumo, ...d.secoes.flatMap((s) => s.blocos.flat())])
    for (const t of textos) expect(preencher(t, { instituicao: 'X', contatoEncarregado: 'Y' })).not.toMatch(/[{}]/)
  })
})
