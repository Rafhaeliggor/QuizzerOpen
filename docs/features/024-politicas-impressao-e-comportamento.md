# 024 — Políticas da prova, impressão/PDF, duplicação e eventos de comportamento

- **Status:** Concluída com pendências
- **Sprint:** 7 (lote 6) · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF05, RF06, RF07, RF08 · **ADRs:** [0035](../adr/0035-politicas-da-prova.md), [0037](../adr/0037-impressao-e-duplicacao-de-prova.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Professor | Define *Gabarito para o aluno: depois do resultado* | Aluno vê a correta, as respostas aceitas e a rubrica no resultado consolidado |
| 2 | Professor | *… depois que a aplicação encerrar* | Antes do fim: "o gabarito fica disponível depois de …" |
| 3 | Professor | *Prazo para recurso: 7 dias* | Após 7 dias da publicação do resultado, o botão some e a API recusa |
| 4 | Professor | *Imprimir / PDF* com e sem gabarito | Página de impressão; Salvar como PDF |
| 5 | Professor | *Duplicar* | Rascunho "(cópia)" com mesmos parâmetros e questões |
| 6 | Aluno | Troca de aba durante a prova | Registrado; professor vê "saiu da prova 2×" e a linha do tempo |

## Interface

- Parâmetros da prova: `exibirGabarito` (`NUNCA`|`APOS_CORRECAO`|`APOS_ENCERRAMENTO`),
  `prazoRecursoDias` (1–60 ou nulo), `exigeMfa`.
- `POST /provas/:id/duplicar` · tela `/app/provas/:id/imprimir`.
- `POST /aluno/tentativas/:id/eventos` e `POST /publico/tentativas/:id/eventos`
  (`{tipo, ocorridoEm?}`) · `GET /aplicacoes/tentativas/:id/eventos` (professor).
- Resultado do aluno: `gabaritoVisivel`, `gabaritoDisponivelEm`, `prazoRecursoAte`,
  `recursoEncerrado` e, quando visível, `gabarito`/`rubrica` por questão.

## Testes

`test/politicas-e-relatorios.e2e-spec.ts` (gabarito nas três políticas, prazo de recurso, eventos,
duplicação), `correcao/calculo.spec.ts` (`gabaritoVisivel`, `prazoRecursoFim`),
`ExecucaoProva.test.tsx` (envio dos eventos), `e2e/recursos-avancados.spec.ts` (impressão).

## Pendências e limitações

- [ ] PDF gerado no servidor / versões A-B da prova impressa.
- [ ] Eventos só de visibilidade (sem copiar/colar, tela cheia, múltiplos monitores).
- [ ] Notas geradas antes do lote 6 ficam com a política `NUNCA` e sem prazo.
