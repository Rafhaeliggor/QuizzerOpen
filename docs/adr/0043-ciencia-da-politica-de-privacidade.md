# ADR-0043: Registro de ciência da política de privacidade

- **Status:** Substituído em parte pelo [ADR-0060](0060-termos-de-uso-e-aceite-obrigatorio.md) (aceite agora bloqueante, com Termos de Uso)
- **Data:** 2026-10-12
- **Responsável:** Dev A, Dev C
- **Requisitos relacionados:** RNF05 (LGPD)

## Decisão

- `POLITICA_VERSAO` (configuração) identifica o texto vigente. O usuário guarda `politicaAceitaEm` e
  `politicaVersao`; `/auth/me` informa `politicaPendente`.
- Após o login aparece um aviso com link para a política e o botão **"Li e estou ciente"**
  (`POST /minha-conta/politica/aceitar`, auditado). **Não bloqueia** o uso ("Agora não" adia nesta
  sessão) e **nunca aparece durante a prova** (a tela de execução fica fora dos layouts).
- Mudou o texto? Troque `POLITICA_VERSAO` — todos voltam a ver o aviso.
- O seed marca as contas de demonstração como cientes.

## Consequências

- É registro de **ciência** (base legal da instituição é definida pelo DPO), não consentimento para
  tratamento — a política precisa dizer isso.
