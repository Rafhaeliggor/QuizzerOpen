# 041 — Homepage pública

- **Status:** Concluída
- **Sprint:** além do plano (2026-10-27) · **Responsável:** Dev C
- **Requisitos:** RNF04

## Objetivo

Dar ao endereço raiz (`/`) uma página de apresentação do Quizzer. Ela também serve de ponto de entrada para os três acessos: profissional, aluno e prova por PIN. Antes, `/` levava o visitante direto ao login profissional.

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Visitante | Abre `/` | Vê a homepage, com recursos, passos, perfis, segurança e os botões de acesso |
| 2 | Visitante | Clica em *Entrar como professor* / *Sou aluno* / *Tenho um PIN* | Vai para `/login`, `/aluno/login` ou `/p` |
| 3 | Profissional ou aluno logado | Abre `/` | É levado direto à sua área (`/app` ou `/aluno`), como antes |

## Funcionamento

- **Rota:** `src/paginas/Inicio.tsx` mostra a `Homepage` quando não há sessão e mantém o redirecionamento para quem está logado.
- **Tela:** `src/paginas/home/Homepage.tsx` + `homepage.css`. Seções: topo fixo, hero com uma questão ilustrativa feita só em CSS (a CSP não permite imagens externas), recursos, como funciona, perfis, segurança e privacidade, chamada final e rodapé com Termos e Política.
- **Tema:** usa apenas os tokens do design system, então segue o tema claro/escuro (feature 039).
- **Responsivo:** 3/4 colunas no desktop, 2 até 960px e 1 até 640px. No celular, o topo mostra só *Entrar*, e o PIN fica no hero.

## Testes

- Unitário: `src/paginas/Inicio.test.tsx` (visitante vê a homepage e os links; profissional e aluno logados são redirecionados).
- Conferência visual por captura: desktop claro e escuro, e celular de 390px sem rolagem horizontal.

## Pendências

- Os textos não passaram por revisão de marketing e não há capturas reais das telas na página.
