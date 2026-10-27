# 007 — Frontend base: rotas, layouts e design system

- **Status:** Concluída com pendências
- **Sprint:** 1 · **Responsável:** Dev C
- **Requisitos:** RNF01, RNF04, RNF05
- **ADRs:** [0009](../adr/0009-frontend-spa-unico.md), [0013](../adr/0013-convencoes-de-nomenclatura-e-api.md)

## Objetivo

Base do SPA único cobrindo os dois ambientes: roteamento protegido, layouts, cliente HTTP
e componentes compartilhados.

## Rotas

| Rota | Acesso | Tela |
|---|---|---|
| `/` | — | Redireciona para a área do usuário ou para `/login` |
| `/login` | público | Login profissional |
| `/aluno/login` | público | Login do aluno (e-mail ou matrícula) |
| `/mfa` | após senha válida | Cadastro/verificação TOTP |
| `/trocar-senha` | autenticado | Troca obrigatória de senha |
| `/app` | profissional | Painel |
| `/app/usuarios` | Admin, Coordenador | Gestão de usuários |
| `/app/questoes…`, `/provas…`, `/aplicacoes…`, `/turmas…`, `/recursos…`, `/relatorios…` | Admin, Coord., Professor | Ver features 008–014 |
| `/app/correcoes…` | + Corretor | Ver feature 012 |
| `/app/auditoria` | Admin | Ver feature 015 |
| `/aluno`, `/aluno/prova/:id`, `/aluno/comprovante/:id`, `/aluno/resultados…`, `/aluno/recursos` | aluno | Ver features 011–013 |
| `/p`, `/p/:pin…` | público | Prova pública por PIN (feature 011) |
| `/acesso-negado`, `*` | — | Erros |

## Design system (`apps/web/src/design-system`)

Tokens CSS em `src/index.css` (cores, espaçamentos, raios, sombras). Componentes:

| Componente | Uso |
|---|---|
| `Button` | variantes `primario`, `secundario`, `fantasma`; estado `carregando` |
| `TextField` | rótulo, ajuda e erro associados ao input (acessível) |
| `AlertBanner` | `info`, `sucesso`, `alerta`, `erro` (erro/alerta com `role="alert"`) |
| `StatusBadge` | mapeia status de domínio → tom (`RASCUNHO`, `PUBLICADA`, `EM_ANDAMENTO`…) |
| `DataTable` | tabela densa com estados de carregamento/vazio e paginação pelo servidor |
| `Stepper` | etapas do assistente de prova |
| `Timer` | cronômetro regressivo visual (prazo do servidor + correção de relógio) |
| `Dialog`, `Tabs`, `TextArea`, `SelectField`, `BarChart` | confirmações, abas, formulários e gráficos simples |
| `Card`, `Spinner` | apoio |

Layouts: `LayoutProfissional` (navbar + sidebar por papel, sidebar recolhível < 800 px),
`LayoutAluno` (coluna única), `LayoutAuth` (telas de login).

## Testes

- `src/design-system/design-system.test.tsx`, `src/auth/RotaProtegida.test.tsx`,
  `src/paginas/auth/*.test.tsx`, `src/api/cliente.test.ts` (20 testes).
- Validação manual em Chromium (Playwright) contra a stack Docker, desktop 1280 px e
  celular 390 px, **sem erros de CSP**. Bug encontrado e corrigido nessa validação: após o
  MFA a tela voltava ao login (corrida entre limpar a pendência e navegar) — há teste de regressão.

## Pendências e limitações

- [x] ~~`Stepper` e `Timer`~~ — criados nas Sprints 2–3.
- [x] ~~Automatizar o roteiro de navegador no CI~~ — `apps/web/e2e` + job `navegador` ([ADR-0026](../adr/0026-testes-de-navegador-carga-e-supply-chain.md)).
- [x] ~~Foco em diálogos~~ — trava de foco e campo sem perder foco ao digitar ([BUG-058](../bugs-corrigidos.md#bug-058)).
- [x] ~~Pacote inicial pesado~~ — telas profissionais e KaTeX sob demanda ([BUG-060](../bugs-corrigidos.md#bug-060)).
- 🚫 Tema escuro — fora do escopo da prova de conceito (decisão de 2026-10-27; não está no Figma).
- [ ] Revisão de acessibilidade completa (contraste, navegação por teclado no menu mobile) — adiada por decisão de 2026-10-27 (sem verificação automática por enquanto).
- [x] ~~Sino de notificações~~ — feature 015.
- [x] Tela de ativação opcional de MFA e de "minha conta" — lotes 6 e 7.

## Arquivos principais

- `apps/web/src/{main.tsx,rotas.tsx,index.css}`, `src/design-system/*`, `src/layouts/*`, `src/auth/*`, `src/api/*`, `src/paginas/*`
