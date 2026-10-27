# ADR-0021: Escopo de acesso por papel nos módulos de avaliação

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Equipe
- **Requisitos relacionados:** RF02, RNF05 (menor privilégio)
- **Complementa:** [ADR-0006](0006-autenticacao-jwt-sessao.md)

## Decisão

| Recurso | Administrador / Coordenador | Professor | Corretor | Aluno |
|---|---|---|---|---|
| Questões | todas | próprias + publicadas + em revisão (para revisar) | — | — |
| Turmas | todas (escolhe o professor responsável) | as que é responsável | — | — |
| Provas, aplicações, recursos, relatórios | todas | as próprias provas | — | — |
| Fila de correção | todas | provas próprias | **todas** | — |
| Reabrir tentativa | sim | **não** | não | — |
| Usuários | Admin cadastra; ambos listam | — | — | — |
| Auditoria | só Administrador | — | — | — |
| Execução, resultados, recursos próprios | — | — | — | sim |

- Recurso fora do escopo responde **404** (não revela existência).
- O Corretor não tem vínculo com provas no modelo atual, por isso vê toda a fila.

## Consequências

- PENDENTE: atribuição de corretores a provas/turmas e hierarquia Coordenador → professores da
  sua área (aguarda RNs); permissões delegadas (`iam.permissoes_delegadas`).
