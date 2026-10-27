# 019 — LGPD: meus dados, solicitação de exclusão e anonimização

- **Status:** Concluída com pendências
- **Sprint:** 6 (uso real) · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RNF05 · **ADRs:** [0028](../adr/0028-lgpd-anonimizacao.md)

## Casos de uso

| # | Ator | Cenário | Resultado |
|---|---|---|---|
| UC1 | Qualquer usuário | *Minha conta → Baixar meus dados* | JSON com cadastro, sessões (data/IP/navegador), turmas, resultados, recursos, notificações e solicitações |
| UC2 | Qualquer usuário | *Solicitar exclusão dos meus dados* (motivo opcional) | Solicitação "Em análise"; administradores notificados; só uma pendente por vez |
| UC3 | Administrador | *LGPD → Anonimizar* | Conta sem nome/e-mail/matrícula, desativada para sempre; notas mantidas anônimas; matrículas encerradas; notificações apagadas; auditado |
| UC4 | Administrador | *LGPD → Recusar* (resposta obrigatória) | Titular vê a resposta em *Minha conta* |
| UC5 | Administrador | Pedido por e-mail de participante de prova pública | *Participante externo → Anonimizar* pelo e-mail |
| UC6 | Administrador | Atender o próprio pedido / anonimizar o último admin | Bloqueado |
| UC7 | Visitante | Lê `/privacidade` (link nas telas de login) | Política de privacidade (texto-base) |

## Interface

| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/v1/minha-conta/dados` | autenticado (download JSON) |
| GET/POST | `/api/v1/minha-conta/solicitacoes` | autenticado |
| GET | `/api/v1/lgpd/solicitacoes?status` | Administrador |
| POST | `/api/v1/lgpd/solicitacoes/:id/concluir` `{resposta?}` · `/recusar {resposta}` | Administrador |
| POST | `/api/v1/lgpd/externos/anonimizar` `{email, justificativa}` | Administrador |

Telas: `/app/conta` e `/aluno/conta` (também pelo nome na barra superior), `/app/lgpd`, `/privacidade`.

## Testes

- `apps/api/test/lgpd.e2e-spec.ts`: exportação, solicitação (duplicada → 409), notificação ao admin,
  anonimização completa (conta, nota, matrícula, sessões, token já emitido → 401, login → 401,
  reativação → 400, auditoria sem e-mail), recusa, travas de administrador, participante externo.
- Navegador: aluna exporta dados e solicita; admin vê notificação e recusa; aluna vê a resposta.

## Pendências

- [ ] **Revisar a política de privacidade com o DPO** e preencher os campos `[entre colchetes]`
      (`apps/web/src/paginas/Privacidade.tsx`) — o verificador de produção bloqueia enquanto isso.
- [x] Retenção automática configurável para externos — lote 8, [036](036-lgpd-correcao-e-retencao.md). - [ ] Prazo para registros de alunos (decisão institucional).
- [x] Pedido de correção de dados pelo titular — lote 8.
- [x] Registro de ciência da política (versão e data) — lote 7, [029](029-email-e-recuperacao-de-conta.md).

## Arquivos

API: `apps/api/src/modules/lgpd/*` e métodos `anonimizar*` em usuários, correção, aplicação, turmas, notificações.
Web: `apps/web/src/paginas/{MinhaConta,Privacidade}.tsx`, `paginas/profissional/Lgpd.tsx`.
