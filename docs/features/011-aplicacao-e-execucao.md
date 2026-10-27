# 011 — Aplicação e execução de provas

- **Status:** Concluída com pendências
- **Sprint:** 3 · **Responsável:** Dev A + Dev B (API), Dev C (telas)
- **Requisitos:** RF06, RNF03, RN-40 · **ADRs:** [0017](../adr/0017-cronometro-no-servidor.md), [0018](../adr/0018-correcao-snapshot-e-consolidacao.md), [0020](../adr/0020-participante-externo.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| UC1 | Professor | Aplica prova publicada a uma **turma** com janela de datas | Alunos matriculados são notificados e veem a prova |
| UC2 | Professor | Aplica prova **pública** | Gera **PIN** e link `/p/<PIN>` |
| UC3 | Aluno | Inicia a prova dentro da janela | Instância congelada; cronômetro com prazo do servidor |
| UC4 | Aluno | Clica "Iniciar" duas vezes / reabre a página | Mesma tentativa (retoma de onde parou) |
| UC5 | Aluno | Responde | **Autosave** (fechada: na hora; aberta: após 1,2 s ou ao sair do campo) |
| UC6 | Aluno | Perde a conexão | Aviso na tela; respostas reenviadas automaticamente; o tempo **não pausa** |
| UC7 | Aluno | O tempo acaba | Envio automático das respostas salvas (`EXPIRADA`) |
| UC8 | Aluno | Envia (inclusive duplo clique) | Um único envio; **comprovante** com código, início e término |
| UC9 | Aluno | Prova sequencial | Não consegue voltar (UI e API — `409 NAVEGACAO_SEQUENCIAL`) |
| UC10 | Aluno fora da turma / fora da janela / sem tentativas | Inicia | `404` / `409` |
| UC11 | Participante externo | Abre `/p/<PIN>`, informa nome e e-mail | Faz a prova; resultado **não certificado** |
| UC12 | Professor | Acompanha a aplicação | Lista de participantes (inclusive quem não iniciou), status e notas; atualiza a cada 15 s |
| UC13 | Professor | Encerra a aplicação | Janela fecha; tentativas abertas são enviadas |
| UC14 | Admin/Coordenação | Reabre tentativa enviada (justificativa + minutos) | `REABERTA`; nota anterior descartada; auditado; aluno notificado |
| UC15 | Aluno | Abre a mesma prova em outro dispositivo/aba | O novo **assume** (sessão única); o anterior para de gravar e mostra "Prova aberta em outro lugar"; troca auditada e visível ao professor |

## Interface

| Método | Rota | Acesso |
|---|---|---|
| GET/POST | `/api/v1/aplicacoes` (`?provaId`) | Autoria |
| GET | `/api/v1/aplicacoes/:id` | Autoria (acompanhamento) |
| POST | `/api/v1/aplicacoes/:id/encerrar` | Autoria |
| POST | `/api/v1/aplicacoes/tentativas/:id/reabrir` `{ justificativa, minutos }` | Admin, Coordenador |
| GET | `/api/v1/aluno/aplicacoes` | Aluno |
| POST | `/api/v1/aluno/aplicacoes/:id/iniciar` | Aluno |
| GET | `/api/v1/aluno/tentativas/:id` | Aluno (sem gabarito; inclui `agora` do servidor) |
| PUT | `/api/v1/aluno/tentativas/:id/respostas/:versaoQuestaoId` `{ alternativaId? \| texto? }` | Aluno |
| POST | `/api/v1/aluno/tentativas/:id/enviar` · GET `/comprovante` | Aluno |
| GET | `/api/v1/publico/aplicacoes/:pin` · POST `/iniciar {nome,email}` | Público (limite 30/min por IP) |
| GET/PUT/POST | `/api/v1/publico/tentativas/:id/...` | Token do participante |

Telas: `/app/aplicacoes`, `/app/aplicacoes/:id`, "Aplicar prova" em `/app/provas/:id`;
`/aluno`, `/aluno/prova/:id` (tela cheia), `/aluno/comprovante/:id`; `/p`, `/p/:pin`,
`/p/:pin/prova/:id`, `/p/:pin/comprovante/:id`.

## Testes

- `fluxo-completo.e2e-spec.ts`: início idempotente, sem gabarito, isolamento entre alunos, autosave, envio concorrente (mesmo código), escrita após envio (`409`), expiração por varredura, sem tentativas restantes, reabertura (professor `403`, coordenação ok), prova pública (PIN, token, retomada bloqueada).
- `apps/api/src/modules/aplicacao/instancia.spec.ts` (ordem fixa/randomizada, gabarito separado, prazo, PIN).
- `apps/web/src/componentes/execucao/ExecucaoProva.test.tsx` (autosave, reenvio após falha de rede, encerrada pelo servidor, tempo esgotado, confirmação de envio, sequencial).
- Navegador: aluno no celular (390 px) responde, recarrega sem perder respostas, envia e recebe comprovante; participante externo por PIN.

## Pendências e limitações

- [x] Destino `ALUNO_AVULSO` (alunos escolhidos) — lote 7. - [ ] `SUBGRUPO`.
- [x] ~~Sessão única por tentativa~~ — Sprint 5, [ADR-0024](../adr/0024-sessao-unica-por-tentativa.md) (`POST …/sessao` + cabeçalho `X-Sessao-Execucao`).
- [x] Registro de saídas/voltas da aba — lote 6, [024](024-politicas-impressao-e-comportamento.md). - [ ] Reconexões.
- [x] ~~Teste de carga com a turma inteira iniciando junto~~ — [feature 016](016-operacao-backup-e-carga.md).
- [ ] Participante externo não consegue retomar em outro navegador (ver ADR-0020).
- [x] MFA exigível por prova — lote 6, [023](023-mfa-opcional-e-sessoes.md).
- [x] Limite por sessão nas rotas de execução (300/min) — lote 7.

## Arquivos principais

- API: `apps/api/src/modules/aplicacao/{execucao.service,aplicacoes.service,instancia,aplicacao.controller}.ts`
- Web: `apps/web/src/componentes/execucao/*`, `paginas/aluno/*`, `paginas/publico/*`, `paginas/profissional/aplicacoes/*`
