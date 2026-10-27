# 021 — Formatos de questão, mídias e alterações de alto risco

- **Status:** Concluída com pendências
- **Sprint:** 7 (lote 6) · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF04, RF06, RF07 · **ADRs:** [0032](../adr/0032-midias-em-volume-local.md), [0038](../adr/0038-formatos-de-questao-e-alto-risco.md)

## Objetivo

Completar o RF04: além de múltipla escolha e dissertativa, questões **verdadeiro/falso** e
**resposta curta** (correção automática), **imagens e áudios** na versão e **aprovação formal** das
alterações em questões de alto risco/certificação.

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Professor | Cria questão V/F marcando "Falsa" | Alternativas fixas Verdadeiro/Falso; gabarito `F` |
| 2 | Professor | Cria resposta curta com "Pacífico" e "Oceano Pacífico" | Aluno que digita "oceano pacifico" acerta |
| 3 | Professor | Anexa um PNG à questão | Imagem aparece no detalhe, na prova do aluno e na impressão |
| 4 | Professor | Tenta anexar SVG (ou HTML renomeado para .png) | Recusado: "Formato não aceito" |
| 5 | Professor | Edita questão publicada de alto risco | Nova versão **aguardando aprovação**; provas seguem com a vigente |
| 6 | Outro professor | Aprova / recusa a versão pendente | Vira vigente / é descartada com comentário ao autor |
| 7 | Professor | Tenta desmarcar "alto risco" de questão publicada | 403 — só a coordenação |
| 8 | Aluno | Responde V/F e resposta curta | Autosave; correção automática no envio |

## Funcionamento

- **Formatos:** `formato` define a `natureza` (só dissertativa é aberta). V/F usa ids `V`/`F` e não é
  embaralhado em prova randomizada. Resposta curta: até 20 respostas aceitas (até 200 caracteres
  cada); o aluno responde até 500 caracteres; normalização remove acentos, caixa, espaços duplicados
  e pontuação nas pontas. Formato não muda após a publicação.
- **Correção:** `corrigirAutomaticamente(formato, resposta, gabarito)` — dissertativa respondida
  vai para a fila manual; em branco vale 0. O snapshot (`correcao.correcoes_questao`) guarda
  `formato` e `disciplina`.
- **Mídias:** upload em `POST /midias` (multipart, campo `arquivo`), validação por assinatura, nome
  aleatório de 128 bits, servidas em `GET /midias/:arquivo` com `nosniff` e CSP `sandbox`. A versão
  referencia `midiaIds` (até 10). Nova versão copia o vínculo. Entram no backup (feature 018).
- **Alto risco:** ver ADR-0038. A lista "Aguardando minha revisão" inclui questões com versão
  pendente de outra pessoa; o detalhe mostra o selo "aguardando aprovação" e os botões
  *Aprovar nova versão* / *Recusar nova versão*.

## Interface

| Método | Rota | Quem | Observação |
|---|---|---|---|
| POST | `/api/v1/midias` | Professor, Coord., Admin | multipart `arquivo`; 201 `{id, tipo, url, nomeOriginal}` |
| GET | `/api/v1/midias/:arquivo` | público (URL de capacidade) | 404 se o nome não tem 32 hex |
| POST/PUT | `/api/v1/questoes[/:id]` | autoria | novos campos `formato`, `respostasAceitas`, `midiaIds`, `altoRisco` |
| POST | `/api/v1/questoes/:id/versoes/:versaoId/aprovar` | outra pessoa | versão pendente → vigente |
| POST | `/api/v1/questoes/:id/versoes/:versaoId/rejeitar` | outra pessoa | `{comentario}`; descarta a pendente |

Telas: editor de questão (campo **Formato**, bloco *Imagens e áudios*, caixa *alto risco*), detalhe
(versões com mídia, respostas aceitas, pendência), lista (coluna Formato, selos), execução (V/F sem
letras, campo de resposta curta, mídia), correção e recurso (respostas aceitas).

## Configuração

`MIDIAS_DIR` (padrão `./dados/midias`; no Docker o volume `midias`), `MIDIAS_MAX_MB` (5).

## Testes

- Unitários: `correcao/calculo.spec.ts` (normalização, resposta curta, por formato),
  `questoes/midias.spec.ts` (assinaturas, recusa de SVG/HTML/PDF), `aplicacao/instancia.spec.ts` (V/F
  não embaralha, snapshot com formato/disciplina/mídias).
- E2E: `test/questoes-formatos.e2e-spec.ts` (criação e validação por formato, execução e correção,
  upload/serviço de mídia e cabeçalhos, alto risco completo).
- Frontend: `ExecucaoProva.test.tsx` (V/F, resposta curta, mídia). Navegador:
  `e2e/recursos-avancados.spec.ts` (V/F com imagem).

## Pendências e limitações

- [x] Fórmulas LaTeX no texto da questão — lote 7, [028](028-formulas-e-formatos-avancados.md).
- [x] Várias corretas com pontuação parcial — lote 7, [028](028-formulas-e-formatos-avancados.md).
- [x] Coleta de lixo de mídias órfãs (a cada 6 h) — lote 7.
- [x] Mídia no resultado do aluno e na correção (snapshot) — lote 7.
- [x] Resposta numérica com tolerância — lote 7.

## Arquivos principais

`apps/api/src/modules/questoes/{questoes.service,midias.service,midias.controller,dto}.ts`,
`apps/api/src/modules/correcao/calculo.ts`, `apps/api/src/modules/aplicacao/instancia.ts`,
`apps/api/prisma/migrations/20261011150000_formatos_midia_politicas/`,
`apps/web/src/paginas/profissional/questoes/{EditorQuestao,DetalheQuestao,ListaQuestoes}.tsx`,
`apps/web/src/componentes/Midias.tsx`, `apps/web/src/componentes/execucao/ExecucaoProva.tsx`.
