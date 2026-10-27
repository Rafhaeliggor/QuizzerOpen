# ADR-0058: Fuso horário da instituição para datas sem hora e mensagens

- **Status:** Aceito
- **Data:** 2026-10-27
- **Responsável:** Dev A
- **Requisitos relacionados:** RF09 (relatórios por período), RF11 (auditoria); revisão de 2026-10-26

## Contexto

Os filtros de período dos relatórios e da auditoria recebem datas sem hora (`AAAA-MM-DD`), e o servidor as interpretava em **UTC**. "De 10/10" virava 21h de 09/10 no horário de Brasília. Com isso, entravam no período envios do fim da noite do dia anterior e saíam os do fim da noite do último dia. Além disso, o código formatava datas em mensagens com dois fusos diferentes: `America/Maceio` nas aplicações e `America/Sao_Paulo` nos recursos.

## Decisão

- **Um fuso só**, configurável: `FUSO_HORARIO` (nome IANA), com padrão **`America/Maceio`**. Maceió tem o mesmo horário de Brasília e não tem horário de verão. O valor é validado no boot (`config/env.ts`).
- `src/common/fuso/fuso.ts` centraliza as regras:
  - `inicioDoDia` / `periodoNoFuso`: `de` vale a partir das 00:00 locais, e `ate` vale o dia inteiro, com limite exclusivo às 00:00 do dia seguinte. O cálculo acerta dias de mudança de horário de verão em fusos que o têm.
  - `formatarData` / `formatarDataHora`: datas nas mensagens (aplicação disponível, prazo de recurso).
- Os DTOs de período passam a aceitar só `AAAA-MM-DD`, que é o que o frontend envia. Um valor fora desse formato recebe 400 com mensagem em português.
- Instantes com hora (início e fim da janela de aplicação, envio de tentativa) continuam em ISO com fuso explícito, sem mudança.

## Consequências

- Os períodos de relatórios e auditoria batem com o calendário local.
- Outra instituição muda o fuso só pelo `.env`.
- Os testes e2e que montavam "hoje" em UTC passaram a usar o fuso da instituição. Antes, eles podiam falhar entre 21h e meia-noite.
