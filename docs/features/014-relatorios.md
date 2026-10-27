# 014 — Relatórios e exportação

- **Status:** Concluída com pendências
- **Sprint:** 4 · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF09 · **ADRs:** [0019](../adr/0019-fronteiras-entre-modulos.md)

## Funcionamento

Considera a **última tentativa** de cada participante.

- **Por prova** (`/app/relatorios/provas/:id`, filtro opcional `?aplicacaoId=`): participantes,
  pendentes de correção, média, mediana, menor/maior, taxa de aprovação, tempo médio,
  **distribuição das notas** (faixas de 2 pontos), **taxa de acerto por questão** (média da
  fração obtida; anuladas marcadas) e tabela de participantes.
- **Por turma** (`/app/relatorios/turmas/:id`): matriz aluno × prova com média.
- **Exportação CSV** (`;`, UTF-8 com BOM — abre direto no Excel; campos iniciados por `= + - @`
  neutralizados contra injeção de fórmula).

## Interface

| Método | Rota |
|---|---|
| GET | `/api/v1/relatorios/provas` (resumo de todas as provas visíveis) |
| GET | `/api/v1/relatorios/provas/:id` · `/provas/:id/csv` (`?aplicacaoId&turmaId`) |
| GET | `/api/v1/relatorios/turmas/:id` · `/turmas/:id/csv` |

## Testes

- `apps/api/src/modules/relatorios/agregacao.spec.ts`; `fluxo-completo.e2e-spec.ts` (resumo, anulada, CSV, turma).
- Navegador: relatório com gráficos e download do CSV.

## Pendências e limitações

- [x] Indícios para revisão (tempo, saídas, trocas, erros idênticos) — lote 7, [031](031-relatorios-excel-e-indicios.md).
- [x] Por disciplina, por aluno e filtro por período — lote 6. - [x] Excel e impressão/PDF — lote 7.
- [ ] Dashboard executivo (fora do MVP).

## Arquivos principais

- API: `apps/api/src/modules/relatorios/*` · Web: `paginas/profissional/relatorios/Relatorios.tsx`
