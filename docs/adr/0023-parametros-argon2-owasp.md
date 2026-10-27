# ADR-0023: Parâmetros Argon2id da OWASP com re-hash transparente

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A
- **Requisitos relacionados:** RF01, RNF05; plano Dev B Sprint 4 (teste de carga)
- **Substitui parcialmente:** [ADR-0006](0006-autenticacao-jwt-sessao.md) (item "parâmetros padrão da lib")

## Contexto

O teste de carga (40 alunos de uma turma entrando ao mesmo tempo, VPS de 2 vCPUs) mostrou login
com **p95 de 11,8 s** e troca de senha de 7,7 s. Causa: Argon2id com os padrões da biblioteca
(m=64 MiB, t=3, p=4) — 106 ms por verificação isolada e ~4 s para 40 simultâneas.

## Decisão

- Argon2id com a configuração **mínima recomendada pela OWASP** (Password Storage Cheat Sheet):
  **m=19 MiB (19456 KiB), t=2, p=1** — 40 ms por verificação, ~0,8 s para 40 simultâneas.
- **Re-hash transparente**: no login com senha correta, se o hash usa parâmetros antigos
  (`argon2.needsRehash`), ele é refeito com os novos. Nenhuma senha precisa ser redefinida.
- Os parâmetros ficam numa constante única (`PARAMETROS_ARGON2`, `senha.service.ts`); o seed usa os mesmos.

## Resultado medido (40 alunos simultâneos, 2 vCPUs, gerador de carga na mesma máquina)

| | Antes | Depois |
|---|---|---|
| Tempo total do cenário | 15,1 s | 5,6–5,9 s |
| Login p95 | 11,8 s | 2,8 s |
| Troca de senha p95 | 7,7 s | 1,6 s |

## Consequências

- Custo por tentativa de força bruta offline ~2,5× menor que antes, ainda dentro da recomendação
  OWASP; a defesa online continua sendo bloqueio de conta + rate limit.
- Se o VPS ganhar CPUs, os parâmetros podem subir (ex.: m=46 MiB, t=1) — o re-hash migra sozinho.
