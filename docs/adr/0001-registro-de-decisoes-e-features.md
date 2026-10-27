# ADR-0001: Registro de decisões (ADR) e documentação de features

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Equipe

## Contexto

O MVP será construído em 4 semanas por 3 pessoas usando agentes de IA de codificação
(plano geral, Seção 3). A velocidade de geração desloca o gargalo para a revisão humana e
aumenta o risco de decisões implícitas ("o agente escolheu assim") e de inconsistência
entre o que cada pessoa gera.

## Decisão

1. Toda decisão de fato (tecnologia, padrão, regra de negócio interpretada, corte de escopo)
   é registrada como ADR em `docs/adr/NNNN-titulo.md`, usando o modelo `0000-modelo.md`.
2. Toda funcionalidade desenvolvida tem um documento em `docs/features/`, com funcionamento,
   casos de uso, endpoints/telas, testes e **pendências** — usando `docs/features/000-modelo.md`.
3. Os documentos são atualizados no mesmo PR que altera o comportamento.
4. Agentes de IA devem receber estes documentos como contexto antes de gerar código
   (complementa a regra "contexto antes de gerar" do plano).

## Consequências

- Revisão humana fica mais rápida: o revisor compara código com a decisão escrita.
- Custo pequeno e contínuo de manter os documentos atualizados.
