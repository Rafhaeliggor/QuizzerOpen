# ADR-0027: Revogação de acesso em até 30 segundos

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev A
- **Requisitos relacionados:** RF01, RF02, RNF05
- **Complementa:** [ADR-0006](0006-autenticacao-jwt-sessao.md) (remove o risco aceito "token válido até 15 min após logout/desativação")

## Contexto

O access token é um JWT de 15 min sem estado. Logout, desativação de conta, mudança de papel,
reset de senha/MFA e anonimização (LGPD) revogavam a sessão, mas o token já emitido seguia
válido até expirar — risco registrado no checklist de segurança.

## Decisão

- O `AuthGuard` passa a verificar se a **sessão do token (`sid`) continua ativa**: não revogada,
  não expirada e usuário `ativo` (`SessaoService.estaAtiva`).
- Resultado guardado num **cache em memória por 30 s** (até 10 mil sessões) para não consultar o
  banco a cada requisição. Revogar uma sessão limpa sua entrada; revogar todas limpa o cache.
- Sessão inativa → `401 SESSAO_INVALIDA`; o frontend encerra a sessão local.

## Consequências

- Acesso cortado imediatamente na instância que revogou e em até 30 s em outras réplicas.
- Uma consulta indexada por sessão a cada 30 s — teste de carga sem regressão (40 alunos, autosave p95 279 ms).
