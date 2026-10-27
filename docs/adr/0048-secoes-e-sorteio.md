# ADR-0048: Composição por seções, sorteio de questões e nota mínima por seção

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos relacionados:** RF05 ("composição automática por pool", "seções", "critério por seção/combinação", "versões antifraude")

## Contexto

O plano tirou pool/seções do MVP (Seção 6). Sem eles o RF05 ficava ⚠️ e cada aluno recebia as
mesmas questões (só embaralhadas).

## Decisão

- `provas.secoes` (título, ordem, modo `FIXA`/`SORTEIO`, `sortear`, `peso` da seção, `notaMinima`)
  e `prova_questoes.secao_id`. **Uma seção FIXA sem nota mínima é gravada como prova sem seções**
  (modelo anterior, compatível).
- **SORTEIO:** a seção guarda o conjunto ("pool"); para **cada participante** sorteiam-se `sortear`
  questões com gerador criptográfico, e o peso da seção é dividido igualmente entre elas. O sorteio
  acontece na criação da instância e fica congelado nela (auditável, igual para retomadas).
  É o mecanismo de **versões antifraude**: participantes vizinhos recebem questões diferentes.
- **FIXA:** todas as questões da seção, com peso individual (embaralhadas se a prova for randomizada).
  A ordem das seções é sempre preservada.
- **Soma de pesos** para publicar = itens FIXA + pesos das seções de SORTEIO = 100%.
- **Nota mínima por seção** (0–10) soma-se ao critério geral ("combinação"): com critério geral,
  aprova quem atinge a nota geral **e** todas as mínimas; sem critério geral, decidem só as mínimas.
  O snapshot da nota guarda as seções e as notas por seção.
- `PUT /provas/:id/composicao` (seções) substitui a composição; `PUT /provas/:id/questoes` continua
  aceito (vira uma seção FIXA única).

## Consequências

- Relatório "acerto por questão" passa a contar só quem recebeu cada questão.
- Questões de um pool devem ter dificuldade parecida — responsabilidade de quem monta (a tela filtra por disciplina).
