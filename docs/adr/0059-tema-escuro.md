# ADR-0059: Tema escuro com escolha por navegador

- **Status:** Aceito
- **Data:** 2026-10-27
- **Responsável:** Dev C
- **Requisitos relacionados:** RNF04 (apresentação); ADR-0053 (identidade visual do Figma)

## Contexto

O usuário pediu que as configurações permitam trocar a cor do tema e que o padrão siga o sistema operacional. Até então só existia o tema claro do Figma. Os componentes já usavam os tokens de `src/index.css`, com cerca de 15 cores fixas espalhadas pelo CSS.

## Decisão

- **Três opções:** *Padrão do sistema* (padrão), *Claro* e *Escuro*, na aba **Aparência** de Configurações / Minha conta, nos dois ambientes.
- **Só CSS e tokens:** a paleta escura redefine os tokens `--qz-cor-*`. "Padrão do sistema" usa `@media (prefers-color-scheme: dark)` sem JavaScript. Uma escolha explícita grava `data-tema="claro|escuro"` no `<html>`. As cores fixas viraram tokens novos: `--qz-cor-sobre-destaque` (texto sobre cor sólida), `--qz-cor-hover`, `--qz-cor-cabecalho-tabela`, `--qz-cor-placeholder` e `--qz-cor-trilho`.
- **No escuro, o texto sobre cor sólida é escuro.** A primária e os tons de estado ficam mais claros para ter contraste sobre o fundo escuro (≥ 4,5:1). Texto branco sobre esses tons não passaria.
- **A preferência fica no navegador** (`localStorage`, chave `qz-tema`), não na conta. O tema é uma preferência do aparelho, vale antes do login e não precisa de API nem migração.
- **Sem flash de cor:** `public/tema.js` é um script externo e síncrono no `<head>`, que aplica a escolha antes do primeiro desenho. Ele é externo porque a CSP (`script-src 'self'`) não aceita script inline.
- **A impressão continua clara:** a paleta escura só vale em `@media screen`.

## Consequências

- Uma cor nova no CSS deve usar um token. Uma cor fixa aparece errada no tema escuro.
- A escolha não acompanha o usuário em outro aparelho. Se isso for pedido, ela pode ir para `/minha-conta/preferencias`, mantendo o `localStorage` como cache.
