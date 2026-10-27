# Guia de integração (LMS/ERP)

Para a equipe de TI que liga o sistema acadêmico ao Quizzer. Decisão técnica em
[ADR-0051](../adr/0051-api-de-integracao.md).

## 1. Chave

Um administrador cria em **Integrações → Nova chave** (nome, escopos, validade opcional). O token
`qz_<prefixo>_<segredo>` aparece **uma única vez** — guarde no cofre do sistema que vai chamar a API.
Revogue pela mesma tela (efeito imediato).

| Escopo | Libera |
|---|---|
| `turmas:escrever` | `PUT /api/v1/integracao/v1/turmas/<código>` |
| `turmas:ler` | `GET /api/v1/integracao/v1/turmas` |
| `notas:ler` | `GET /api/v1/integracao/v1/notas` |

Todas as chamadas: `Authorization: Bearer qz_…`, HTTPS, JSON. Limite: 600 requisições/min por IP.

## 2. Sincronizar uma turma

```http
PUT /api/v1/integracao/v1/turmas/CALC1-2026.2
Content-Type: application/json

{
  "nome": "Cálculo I — 2026.2",
  "periodoInicio": "2026-08-01",
  "periodoFim": "2026-12-20",
  "professorEmail": "ana@instituicao.edu.br",
  "alunos": [{ "nome": "Bruno Lima", "email": "bruno@aluno.edu.br", "matricula": "2026000001" }],
  "removerAusentes": true
}
```

- O **código** (até 64 caracteres: letras, números, `.`, `_`, `:`, `-`) identifica a turma; a mesma
  chamada cria ou atualiza.
- O professor precisa já ter conta no Quizzer. Alunos novos ganham conta (e convite por e-mail, se
  configurado).
- Resposta: `{ turmaId, criada, matriculados, jaMatriculados, desvinculados, contasCriadas, erros[] }`.
  Erros por aluno não interrompem os demais.

## 3. Ler notas

```http
GET /api/v1/integracao/v1/notas?desde=2026-10-01T00:00:00Z&turma=CALC1-2026.2&limite=100
```

Resposta: `{ itens: [...], proximoCursor }`. Repita com `cursor=<proximoCursor>` até vir `null`.
Guarde o maior `consolidadoEm` recebido e use como `desde` na próxima sincronização.

```json
{
  "resultadoId": "…", "provaId": "…", "provaTitulo": "Avaliação 1",
  "turmaCodigoExterno": "CALC1-2026.2",
  "aluno": { "email": "bruno@aluno.edu.br", "matricula": "2026000001", "nome": "Bruno Lima" },
  "tentativa": 1, "nota": 8.5, "situacao": "APROVADO",
  "enviadoEm": "…", "consolidadoEm": "…"
}
```

Só entram resultados **consolidados** (sem correção pendente) de alunos com conta. Uma nota
reprocessada por recurso volta a aparecer com `consolidadoEm` original — recomenda-se reler a
prova inteira quando houver recurso (`provaId=`).

## 4. Erros

| Status | Quando |
|---|---|
| 401 `CHAVE_INVALIDA` | token ausente, errado, revogado ou vencido |
| 403 `ESCOPO_INSUFICIENTE` | a chave não tem o escopo da rota |
| 400 | dados inválidos (mensagem explica) |
| 429 | limite de requisições |
