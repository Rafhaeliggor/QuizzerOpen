# 015 — Notificações in-app e auditoria

- **Status:** Concluída com pendências
- **Sprint:** 4 · **Responsável:** Dev A (notificações), Dev B (auditoria), Dev C (sino e tela)
- **Requisitos:** RF10, RF11, RF01 (notificar titular) · **ADRs:** [0022](../adr/0022-notificacoes-e-auditoria.md)

## Notificações

Sino na barra superior dos dois ambientes (contador de não lidas, lista com link para a tela
relacionada, "marcar todas como lidas"), atualizado em tempo real (SSE, lote 8 — [034](034-notificacoes-tempo-real-e-fila.md))
com consulta de reserva a cada 5 min. Falha ao carregar a lista aparece como aviso no painel (BUG-036).

| Evento | Quem recebe |
|---|---|
| Prova disponível (aplicação para a turma) / tentativa reaberta | Alunos da turma / o aluno |
| Resultado publicado | Aluno |
| Recurso aberto | Autor da prova |
| Recurso decidido / nota reprocessada | Aluno(s) |
| Conta bloqueada por tentativas | Titular |

API: `GET /api/v1/notificacoes`, `POST /api/v1/notificacoes/:id/lida`, `POST /api/v1/notificacoes/lidas`.

## Auditoria

Tabela `auditoria.eventos` **somente inserção** (trigger no banco bloqueia UPDATE/DELETE/TRUNCATE).
Lista de eventos no ADR-0022. Tela `/app/auditoria` (Administrador) com filtro por ação.
API: `GET /api/v1/auditoria?acao&recurso&usuarioId&pagina&tamanho`.

## Testes

- `fluxo-completo.e2e-spec.ts`: notificações de prova disponível e resultado; eventos do recurso; `DELETE` na auditoria falha.
- Navegador: sino do aluno mostra "Recurso deferido".

## Pendências e limitações

- [x] E-mail opcional (cópia das notificações) — lote 7, [029](029-email-e-recuperacao-de-conta.md). - [ ] Push.
- [x] Tempo real por SSE — lote 8, [034](034-notificacoes-tempo-real-e-fila.md).
- [x] Nome do usuário, filtro por período e exportação CSV — lote 6, [025](025-relatorios-avancados-e-auditoria.md). - [ ] Política de retenção.

## Arquivos principais

- API: `apps/api/src/modules/{notificacoes,auditoria}/*`, trigger na migration `20261010180000_sprints_2_a_4`
- Web: `apps/web/src/componentes/SinoNotificacoes.tsx`, `paginas/profissional/Auditoria.tsx`
