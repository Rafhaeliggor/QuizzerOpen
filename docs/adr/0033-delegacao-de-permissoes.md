# ADR-0033: Delegação de permissões específicas sem mudar o papel

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev A
- **Requisitos relacionados:** RF02 ("delegar permissão específica sem alterar o papel"), RNF05

## Contexto

O RF02 prevê delegação, mas as RNs com o catálogo de permissões não estão no repositório. A tabela
`iam.permissoes_delegadas` existia desde a Sprint 1 sem regra nem tela.

## Decisão

- **Catálogo fechado no código** (`common/auth/permissoes.ts`), só com ações hoje restritas à gestão:
  `REABRIR_TENTATIVAS`, `DESBLOQUEAR_CONTAS` (consulta de usuários + desbloqueio) e
  `CONSULTAR_AUDITORIA`. Nenhuma permissão de alto impacto (criar usuário, mudar papel, LGPD) é
  delegável.
- **Quem concede:** Administrador e Coordenador, com **justificativa obrigatória** (auditada
  `PERMISSAO_CONCEDIDA/REVOGADA`). **Quem recebe:** apenas Professor e Corretor; nunca a si mesmo.
- **Aplicação no guard:** a rota mantém `@Papeis(...)` e ganha `@Delegavel('X')`. Se o papel não
  bastar, o `AuthGuard` consulta as permissões do usuário (cache de 30 s, como a sessão — ADR-0027).
  O escopo de dados continua o do papel (ex.: reabrir só tentativas das aplicações que já vê).
- **Mudar o papel remove todas as delegações** do usuário.
- `GET /auth/me` devolve `permissoes` para a interface mostrar menus; a API é quem decide.

## Consequências

- Novas permissões exigem código (catálogo + `@Delegavel`) — intencional, evita permissões soltas.
- Delegação sem prazo de expiração (revogação manual). Pendente: validade opcional.
