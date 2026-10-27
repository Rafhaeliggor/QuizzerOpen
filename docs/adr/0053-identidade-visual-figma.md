# ADR-0053: Identidade visual do Figma no frontend

- **Status:** Aceito
- **Data:** 2026-10-18
- **Responsável:** Dev C
- **Requisitos relacionados:** RNF04 (apresentação, design system compartilhado)

## Contexto

O frontend usava um visual provisório: azul `#1d4ed8`, fonte do sistema e barra superior com o menu lateral agrupado. O projeto ganhou um arquivo Figma com 19 telas, 13 do ambiente profissional e 6 do aluno, exportadas em `docs/design/figma/`. Era preciso adotar esse visual sem reescrever as páginas nem mudar a API.

## Decisão

- **Tokens primeiro.** Cores, raios, fonte e espaçamentos do Figma substituem os valores em `src/index.css`. Os componentes do design system foram ajustados ao novo visual mantendo a mesma API: `Tabs`, `DataTable` (paginação numerada), `Stepper` (pílulas), `AlertBanner` (com ícone) e `Timer`. Foram acrescentados `Metrica`, `Interruptor`, `ColunasChart` e `Icone`.
- **Fonte Inter servida pelo próprio app** (`@fontsource-variable/inter`). A CSP (`default-src 'self'`) não permite o Google Fonts, e não vale abrir uma exceção só para isso.
- **Ícones inline em SVG** (traçados no estilo Lucide), sem biblioteca de ícones: são cerca de 50 ícones e nenhuma dependência nova em tempo de execução.
- **Layout profissional** com menu lateral fixo, cartão da instituição, menu plano na ordem do Figma, trilha de navegação no topo (instituição / seção / título da subpágina, informado pelo `CabecalhoPagina`) e menu do usuário com "Sair". Os itens de administração que o Figma não mostra (Auditoria, LGPD, Integrações) continuam no menu, só para quem tem permissão.
- **Layout do aluno** com barra superior, navegação central (Minhas provas, Resultados, Contestações), selo "Ambiente do aluno" e avatar com iniciais. "Minha conta" foi para o menu do avatar.
- **Instituição única:** não existe cadastro de instituição. O nome mostrado vem de `NOME_INSTITUICAO` (padrão "Unima") e o ano letivo é o ano corrente. O seletor de instituição do Figma não foi implementado.
- **Central de ajuda:** não há página de ajuda no sistema. O cartão "Precisa de uma mão?" aponta para `URL_AJUDA` e fica oculto quando a variável está vazia.
- **Dados reais acima do mock:** elementos do Figma sem dado correspondente na API (disciplina do professor, "Padrões de avaliação" da instituição, entre outros) foram omitidos em vez de preenchidos com valores fixos. A lista por tela está na feature 037.
- **Nome do produto:** o Figma escreve "Quizzier". Mantivemos "Quizzer", o nome usado no repositório, nos documentos e no título da página.

## Consequências

- Mudar a identidade visual de novo exige mexer só nos tokens e em `ds.css`/`layouts.css`.
- `NOME_INSTITUICAO` e `URL_AJUDA` entram no bundle durante o build. Depois de alterá-las, é preciso refazer a imagem (`docker compose build nginx`).
- O teste de navegador passou a esperar a saudação por horário ("Bom dia, …") em vez de "Olá, …" no painel profissional.
