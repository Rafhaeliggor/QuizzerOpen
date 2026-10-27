# ADR-0009: Frontend — SPA React único com rotas por ambiente e design system próprio

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev C
- **Requisitos relacionados:** RNF01, RNF04, RNF05

## Contexto

O RNF01 prevê dois frontends (Web Profissional e Web Aluno); o plano decidiu por **um único
app React com rotas protegidas por papel** no MVP. O RNF04 exige design system compartilhado
(`DataTable`, `StatusBadge`, `Timer`, `Stepper`, `AlertBanner`).

## Decisão

- **React 19 + Vite 8 + TypeScript 6**, **React Router 8** (modo data: `createBrowserRouter`)
  e **TanStack Query 5** para dados do servidor.
- Rotas por ambiente: `/login` + `/app/*` (profissional) e `/aluno/login` + `/aluno/*` (aluno).
  `RotaProtegida` checa ambiente, papel e troca de senha pendente; usuário de um ambiente que
  acessa o outro é levado à sua própria área.
- Layouts distintos: profissional com navbar + sidebar (menu filtrado por papel); aluno com
  coluna única, sem distrações.
- **Design system próprio** em `src/design-system/`, sem biblioteca de UI: tokens em CSS
  custom properties (`src/index.css`) + componentes (`Button`, `TextField`, `AlertBanner`,
  `StatusBadge`, `DataTable`, `Card`, `Spinner`). `Timer` (Sprint 3) e `Stepper` (Sprint 2)
  pendentes. Componentes do DS mantêm os nomes do RNF04 (em inglês).
- Access token **só em memória**; sessão restaurada no carregamento via `/auth/refresh`
  (ADR-0006). O cliente HTTP renova a sessão uma única vez para requisições simultâneas em 401.
- Mesma origem em todos os ambientes (Vite proxy em dev, Nginx em produção) → **sem CORS**.
- CSP restritiva no Nginx (`script-src 'self'; style-src 'self'`, sem inline).

## Alternativas consideradas

- **Biblioteca de componentes (MUI, Mantine, shadcn)** — acelera, mas adiciona peso e
  estilos inline/CSS-in-JS que exigiriam afrouxar a CSP; o conjunto necessário é pequeno.
- **Next.js/SSR** — desnecessário para um painel autenticado; complica a infraestrutura.

## Consequências

- Separar em dois SPAs no futuro é viável: as áreas já não compartilham layout nem rotas.
- PENDENTE: tema escuro, i18n (só pt-BR), testes ponta a ponta automatizados no CI
  (hoje há um roteiro Playwright usado manualmente — ver feature 007).
