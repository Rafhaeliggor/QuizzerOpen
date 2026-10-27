# ADR-0049: Corretores designados, correção às cegas e rubrica com critérios pontuados

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A, Dev C
- **Requisitos relacionados:** RF07, RF08

## Decisão

- **Corretores designados** (`provas.prova_corretores`): sem designação, vale a regra anterior (corretor
  vê todas as provas). Com designação, só os designados (corretores, professores ou coordenadores),
  o autor e a gestão veem e corrigem as tentativas daquela prova (`ProvasService.idsCorrigiveis`).
- **Correção às cegas** (`Prova.correcaoAsCegas`, congelada na nota): enquanto o resultado não
  consolida, as telas de correção mostram "Participante XXXXXX" (sufixo do id da nota) e escondem o
  e-mail. Relatórios e acompanhamento não mudam (o autor da prova ainda sabe quem fez — o objetivo é
  reduzir viés na correção, não sigilo absoluto).
- **Rubrica estruturada:** dissertativa pode ter critérios com pontos (`rubrica.itens`). O corretor
  informa os pontos por critério (`pontosItens`); a fração = soma ÷ total; o detalhamento fica em
  `correcoes_questao.avaliacao_itens`. Sem critérios, segue o percentual.
- **Recurso encaminhado à coordenação:** o professor pode encaminhar (motivo obrigatório, auditado,
  coordenação avisada); a partir daí só Coordenação/Administração decidem.

## Alternativas consideradas

- **Dupla correção com média/arbitragem** — mais pesada de operar; fica como evolução.
