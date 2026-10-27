# 008 — Banco de questões

- **Status:** Concluída com pendências
- **Sprint:** 2 · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF04 · **ADRs:** [0016](../adr/0016-simplificacoes-de-dominio-no-mvp.md), [0021](../adr/0021-escopo-de-acesso-por-papel.md)

## Objetivo

Cadastrar, versionar e publicar questões fechadas e abertas, com dupla checagem e alerta de duplicidade.

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| UC1 | Professor | Cadastra questão fechada (alternativas + correta) ou aberta (rubrica) | Salva como **Rascunho** (versão 1) |
| UC2 | Professor | Envia rascunho para revisão | **Em revisão**; se houver questão ≥ 80% parecida na disciplina, alerta e pede confirmação |
| UC3 | Outro professor/coordenação | Aprova | **Publicada** — disponível para provas |
| UC4 | Outro professor/coordenação | Devolve com comentário | Volta a **Rascunho**; o autor vê o comentário |
| UC5 | Autor | Tenta aprovar a própria questão | `403` (dupla checagem) |
| UC6 | Autor | Edita questão publicada | Nova versão vigente; provas existentes mantêm a versão antiga |
| UC7 | Autor/coordenação | Arquiva | **Arquivada** (sai das listas de composição) |

## Interface

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/questoes?escopo=todas\|minhas\|revisao\|publicadas&status&natureza&disciplina&busca&pagina&tamanho` | Lista (versão vigente) |
| GET | `/api/v1/questoes/disciplinas` | Disciplinas existentes (filtro) |
| GET | `/api/v1/questoes/:id` | Detalhe com todas as versões, `podeEditar`, `podeRevisar` |
| POST | `/api/v1/questoes` | Cria rascunho `{ disciplina, topico?, dificuldade, natureza, enunciado, alternativas?[{texto}], alternativaCorreta?, rubrica? }` |
| PUT | `/api/v1/questoes/:id` | Edita (rascunho no lugar / publicada = nova versão) |
| POST | `/api/v1/questoes/:id/enviar-revisao` | `{ confirmarDuplicidade? }` · `409 POSSIVEL_DUPLICIDADE` com `similares` |
| POST | `/api/v1/questoes/:id/aprovar` · `/rejeitar {comentario}` · `/arquivar` | Ciclo de vida |

Telas: `/app/questoes` (abas Todas/Minhas/Aguardando minha revisão/Publicadas + filtros),
`/app/questoes/nova`, `/app/questoes/:id`, `/app/questoes/:id/editar`.

## Testes

- `apps/api/test/fluxo-completo.e2e-spec.ts` (bloco RF04): dupla checagem, rejeição, edição no lugar, duplicidade, nova versão, natureza imutável.
- `apps/api/src/modules/questoes/similaridade.spec.ts`.
- Navegador: criação → revisão por outro professor → publicação.

## Pendências e limitações

- [x] Imagem/áudio (lote 6) e fórmulas LaTeX (lote 7).
- [x] Edição de questão de "alto risco/certificação" com aprovação formal — lote 6, [021](021-formatos-midia-e-alto-risco.md).
- [x] V/F, resposta curta (lote 6), várias corretas, numérica (lote 7), associação e ordenação (lote 8).
- [ ] Tópicos hierárquicos e lista controlada de disciplinas.
- [ ] Rich text no enunciado (hoje texto simples com quebras de linha).
- [ ] Deduplicação mais robusta (pg_trgm/embeddings) e entre disciplinas.

## Arquivos principais

- API: `apps/api/src/modules/questoes/*` · Web: `apps/web/src/paginas/profissional/questoes/*`
