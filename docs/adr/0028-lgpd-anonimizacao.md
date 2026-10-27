# ADR-0028: LGPD — exportação e anonimização preservando o registro acadêmico

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev A / Dev B
- **Requisitos relacionados:** RNF05 ("mecanismo de solicitação de exclusão/anonimização de dados pessoais"), LGPD arts. 16, 18 e 19

## Decisão

- **Acesso (art. 18, II):** qualquer usuário baixa em *Minha conta* um JSON com cadastro,
  sessões (data, IP, navegador), turmas, resultados, recursos, notificações e solicitações.
- **Eliminação (art. 18, VI):** o titular solicita; o **Administrador** atende (prazo de 15 dias,
  art. 19) ou recusa com resposta obrigatória. Pedido notifica os administradores.
- **Anonimização em vez de exclusão física.** Notas, tentativas e recursos são registros
  acadêmicos que a instituição deve manter (art. 16, I). Ao atender:
  - conta: nome "Titular anonimizado", e-mail `anonimizado+<id>@anonimizado.invalid`, sem
    matrícula, senha aleatória inutilizável, sem MFA, desativada para sempre (não pode ser
    reativada nem editada), sessões e permissões apagadas;
  - snapshots de nota: nome e e-mail removidos (notas preservadas);
  - matrículas ativas encerradas; notificações apagadas.
- **Participante externo** (sem conta): o Administrador anonimiza pelo e-mail (notas e
  instâncias, inclusive a chave interna que continha o e-mail).
- **Auditoria imutável não guarda dado pessoal**: só ids, ações e IP. Correção feita junto:
  `TENTATIVA_INICIADA` gravava o nome do participante. O e-mail anonimizado também não vai para a auditoria.
- Um administrador não atende o próprio pedido; o último administrador ativo não pode ser anonimizado.
- Página pública `/privacidade` com texto-base a ser revisado pela instituição (DPO).

## Consequências

- Respostas dissertativas e justificativas de recurso podem conter dados que o próprio titular
  escreveu; permanecem como parte do registro acadêmico (documentado na política).
- Eventos de auditoria anteriores a esta correção contêm o nome do participante em
  `TENTATIVA_INICIADA` e não podem ser alterados (tabela imutável) — afeta só o ambiente de
  homologação; registrado em `docs/bugs-corrigidos.md` (BUG-013).
- PENDENTE: portabilidade em formato padronizado, revisão jurídica da política, prazo de retenção definido pela instituição.
