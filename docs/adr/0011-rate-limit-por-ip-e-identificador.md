# ADR-0011: Rate limit por IP + identificador (turmas atrás de NAT)

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A / Dev B
- **Requisitos relacionados:** RF01, RF06, RNF05

## Contexto

A primeira versão limitava as rotas de login a 10 req/min **por IP** na API e 20 req/min por
IP no Nginx (incluindo `/auth/refresh`). No teste de navegador isso já gerou `429` para um
único usuário. Pior: numa aplicação de prova, a turma inteira entra pela mesma rede do campus
(mesmo IP público via NAT) — um limite estrito por IP bloquearia alunos legítimos.

## Decisão

- **API** (`@nestjs/throttler`, `src/common/throttle/throttlers.ts`), dois limitadores:
  - `default`: por IP, **600 req/min** (`RATE_LIMIT_POR_IP`) — só contém flood.
  - `credenciais`: apenas em rotas com `@RotaCredencial()` (logins, MFA, troca de senha),
    por **IP + identificador** (hash SHA-256 de e-mail/matrícula/mfaToken/Authorization),
    **10 req/min** (`RATE_LIMIT_CREDENCIAIS`).
- A proteção contra força bruta **por conta** continua sendo o bloqueio após N falhas (ADR-0006).
- **Nginx**: zona `login` só para `/auth/(profissional|aluno)/login` e `/auth/mfa/`,
  300 req/min por IP com burst 100 — proteção grosseira; `/auth/refresh`, `/auth/me` e
  `/auth/logout` não entram na zona.
- O IP real vem do Nginx (`X-Forwarded-For` **substituído**, não concatenado) e a API confia
  em exatamente 1 proxy (`TRUST_PROXY=1`).

## Consequências

- 30 alunos diferentes no mesmo IP conseguem logar ao mesmo tempo (coberto por teste e2e).
- O armazenamento do throttler é em memória (uma instância da API). PENDENTE: mover para
  Redis se a API passar a ter mais de uma réplica.
- PENDENTE (Sprint 2): rota pública de acesso por PIN precisa de limitador próprio
  (por IP + aplicação) — tarefa de revisão de segurança do Dev B.
