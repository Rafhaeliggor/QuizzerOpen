# 039 — Tema claro/escuro nas configurações

- **Status:** Concluída
- **Sprint:** além do plano (2026-10-27) · **Responsável:** Dev C
- **Requisitos:** RNF04 · **ADRs:** [ADR-0059](../adr/0059-tema-escuro.md)

## Objetivo

Deixar cada pessoa escolher o tema da interface. Por padrão, ele acompanha o modo claro/escuro do sistema operacional.

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Qualquer usuário | Usa o sistema sem mexer em nada, com o aparelho no modo escuro | A interface aparece escura e muda junto se o aparelho trocar de modo |
| 2 | Profissional | Configurações → aba *Aparência* → *Escuro* | Todas as telas ficam escuras, também depois de recarregar e no login |
| 3 | Aluno | Minha conta → *Aparência* → *Claro* | Interface clara, mesmo com o aparelho no modo escuro |
| 4 | Qualquer usuário | Volta para *Padrão do sistema* | A escolha é apagada e o tema volta a seguir o aparelho |
| 5 | Professor | Imprime uma prova com o tema escuro ativo | A impressão sai clara |

## Funcionamento

- **Tokens:** `src/index.css` tem a paleta clara em `:root` e a escura em dois blocos com os mesmos valores: `prefers-color-scheme: dark` (quando não há `data-tema="claro"`) e `[data-tema="escuro"]`. Os dois ficam dentro de `@media screen`. `color-scheme` acompanha o tema (calendário e campos nativos). As barras de rolagem são minimalistas e usam os tokens `--qz-cor-rolagem`/`--qz-cor-rolagem-hover` de cada paleta (AJ-119).
- **Preferência:** `src/util/tema.ts` (`lerTema`, `salvarTema`, `aplicarTema`) grava em `localStorage` (`qz-tema`). "Padrão do sistema" remove a chave e o atributo.
- **Primeiro desenho:** `public/tema.js`, carregado no `<head>` do `index.html`, aplica `data-tema` antes do React (compatível com a CSP).
- **Tela:** aba *Aparência* em `MinhaConta.tsx` (`CartaoAparencia`), com três opções em rádio.

## Testes

- Unitário: `src/util/tema.test.ts` (padrão, gravar, voltar ao sistema, valor inválido).
- Navegador: `e2e/recursos-avancados.spec.ts`, teste "configurações: tema escuro…" (escolha, recarga, cor do fundo e retorno ao padrão com `emulateMedia`).
- Conferência visual por captura (dashboard, banco de questões, nova questão, relatórios, configurações e início do aluno) no tema escuro.

## Pendências

- A escolha é por navegador e não acompanha a conta em outros aparelhos (ver ADR-0059).
- A paleta escura não tem tela correspondente no Figma; os tons foram definidos pelo contraste (≥ 4,5:1).
