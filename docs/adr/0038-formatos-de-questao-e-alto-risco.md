# ADR-0038: Formatos de questão e aprovação de alterações de alto risco

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev A
- **Requisitos relacionados:** RF04, RF07, RF09

## Decisão

- **`Questao.formato`**: `MULTIPLA_ESCOLHA`, `VERDADEIRO_FALSO`, `RESPOSTA_CURTA`, `DISSERTATIVA`. A
  `natureza` (FECHADA/ABERTA) passa a ser **derivada** do formato (só dissertativa é aberta) e
  continua existindo para compatibilidade (API aceita `natureza` sem `formato`). A migration
  preencheu `DISSERTATIVA` nas abertas.
  - **V/F**: alternativas fixas `V`/`F`, nunca embaralhadas.
  - **Resposta curta**: gabarito `{ respostasAceitas: [...] }`; correção automática comparando o
    texto **sem acentos, caixa, espaços extras e pontuação nas pontas**. Até 500 caracteres.
  - Formato não muda depois de publicada (como a natureza antes).
- **Snapshot de correção** ganhou `formato` e **`disciplina`** (congelada no envio) — base do
  relatório por disciplina sem consultar o módulo de questões.
- **Alto risco** (`Questao.altoRisco`): editar uma questão **publicada** de alto risco cria uma
  versão **pendente** (`VersaoQuestao.pendente`); a **vigente** passa a ser a mais recente não
  pendente; composição recusa versão pendente. Outra pessoa (≠ autor e ≠ quem editou) aprova
  (`QUESTAO_VERSAO_APROVADA`) ou recusa com comentário (a pendente é apagada —
  `QUESTAO_VERSAO_RECUSADA`, a auditoria guarda o registro). Uma pendência por vez (nova edição
  atualiza a pendente). Depois de publicada, só a coordenação muda a marcação de alto risco.

## Alternativas consideradas

- **Voltar a questão inteira para EM_REVISAO** — tiraria a questão das novas provas enquanto a
  alteração é analisada; a versão pendente mantém a vigente utilizável.
- **Status próprio da versão (enum)** — o booleano basta para o fluxo atual.
