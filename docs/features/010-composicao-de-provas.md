# 010 — Composição e publicação de provas

- **Status:** Concluída com pendências
- **Sprint:** 2 · **Responsável:** Dev B (API), Dev C (assistente)
- **Requisitos:** RF05 · **ADRs:** [0016](../adr/0016-simplificacoes-de-dominio-no-mvp.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| UC1 | Professor | Cria prova (título, instruções, visibilidade, critério, tempo, tentativas, navegação, ordem) | Rascunho |
| UC2 | Professor | Escolhe questões **publicadas**, define pesos (%), reordena | Composição salva (ordem = ordem da lista) |
| UC3 | Professor | Publica com soma ≠ 100% | Bloqueado — `400 PESO_INVALIDO` |
| UC4 | Professor | Publica com soma 100% | **Publicada** e imutável |
| UC5 | Professor | Tenta editar prova publicada | `409` |

Assistente (Stepper): **1. Dados e parâmetros → 2. Questões e pesos → 3. Revisar e publicar**.
O passo 2 tem "Distribuir igualmente" e indicador da soma dos pesos.

## Interface

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/api/v1/provas` | Lista (questões e soma de pesos) / cria |
| GET/PUT | `/api/v1/provas/:id` | Detalhe com itens (conteúdo e gabarito, para o professor) / edita parâmetros (rascunho) |
| PUT | `/api/v1/provas/:id/questoes` | `{ itens: [{ versaoQuestaoId, peso }] }` |
| POST | `/api/v1/provas/:id/publicar` · `/arquivar` | Ciclo de vida |

Telas: `/app/provas`, `/app/provas/nova`, `/app/provas/:id/editar?passo=0..2`, `/app/provas/:id`.
O `PUT` recebe só os campos de parâmetros (`somenteParametros`), porque a API recusa propriedades extras ([BUG-028](../bugs-corrigidos.md#bug-028)).
Sair do passo *Montagem* pelo Stepper com alterações não salvas pede confirmação. O banco de questões da montagem
é paginado (50 por página). Arquivar a prova pede confirmação.

## Pendências e limitações

- [x] Seções e sorteio por participante (pool) com nota mínima por seção — lote 8, [032](032-secoes-e-sorteio.md).
- [x] Versões antifraude pelo sorteio por participante — lote 8.
- [x] Exportar prova em PDF com/sem gabarito (impressão do navegador) — lote 6, [024](024-politicas-impressao-e-comportamento.md).
- [ ] Tempo limite por questão (Tabela 3 cita "total ou por questão").
- [x] Duplicar prova — lote 6. - [x] Aviso de versão mais nova e atualização em rascunho — lote 7, [028](028-formulas-e-formatos-avancados.md).

## Arquivos principais

- API: `apps/api/src/modules/provas/*` · Web: `apps/web/src/paginas/profissional/provas/*`
