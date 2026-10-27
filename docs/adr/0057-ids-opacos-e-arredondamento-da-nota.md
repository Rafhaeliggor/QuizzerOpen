# ADR-0057: IDs opacos por instância em associação/ordenação e arredondamento decimal da nota

- **Status:** Aceito
- **Data:** 2026-10-26
- **Responsável:** Dev B
- **Requisitos relacionados:** RF06 (execução), RF07 (correção), RNF05; revisão de segurança de 2026-10-26

## Contexto

1. **Gabarito dedutível.** As versões de associação guardam os pares como `I1→O1, I2→O2…`, e as de ordenação guardam a ordem correta como `A,B,C…`. A instância embaralha as alternativas, mas mantém esses IDs, e o participante os recebe pela API. Casar `Ik` com `Ok`, ou ordenar pelos IDs, dava nota máxima sem saber o conteúdo. O resultado do aluno mostrava os mesmos IDs mesmo com `exibirGabarito=NUNCA`. Como a instância é reaproveitada entre tentativas, isso também servia para a tentativa seguinte.
2. **Arredondamento binário.** A nota era `Math.round(razão × 1000) / 100`. Em ponto flutuante, 50,25 de 100 pontos (5,025) virava 502,4999… e dava 5,02 em vez de 5,03, o que pode decidir uma aprovação no limite.

## Decisão

- **IDs opacos por instância** (`opacificar` em `aplicacao/instancia.ts`). Na montagem da instância, as alternativas de associação e ordenação recebem IDs aleatórios (`k` + 8 hexadecimais), e o **gabarito congelado da instância é traduzido** para esses mesmos IDs. Correção automática, resultado, correção manual, recursos e anulação usam só os dados da instância e da nota, então nada mais muda.
  - As versões das questões continuam com `I1/O1/A…`. A impressão e a tela do professor leem a versão, e a impressão sem gabarito já ordena pelo texto (BUG-025).
  - Instâncias criadas antes desta mudança mantêm os IDs antigos. Não há migração: elas já foram entregues ao participante.
  - O indício de "erros idênticos" (ADR-0045) nunca comparou esses dois formatos, então não houve perda.
  - O limite de tamanho de cada ID em `ordem` (DTO) passou de 5 para 12 caracteres.
- **Arredondamento decimal "meio para cima"** (`arredondar` em `correcao/calculo.ts`). O cálculo arredonda `valor × 10^casas` com `toPrecision(12)` antes do `Math.round`, o que elimina o resíduo binário. Vale para a nota (0–10, duas casas) e para as médias dos relatórios.

## Consequências

- O participante não consegue mais deduzir a resposta pelos IDs. Os IDs mudam a cada instância e não carregam posição.
- Uma nota já consolidada não é recalculada pela regra nova, a menos que passe por recurso ou anulação. Nesses casos, a nota pode mudar em 0,01 nos casos de meio exato.
