# 037 — Visual do Figma nos dois ambientes

- **Status:** Concluída com pendências
- **Sprint:** além do plano (2026-10-18) · **Responsável:** Dev C
- **Requisitos:** RNF04 · **ADRs:** [ADR-0053](../adr/0053-identidade-visual-figma.md)

## Objetivo

Aplicar ao frontend a identidade visual das 19 telas do Figma ([`docs/design/figma/`](../design/figma/)) sem mudar a API nem perder funcionalidades. O mapeamento entre cada tela e o arquivo correspondente está em [`docs/design/README.md`](../design/README.md).

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Profissional | Entra no sistema | Vê o menu lateral com a instituição, a trilha "Instituição / Seção / Página" e o menu do usuário com "Sair" |
| 2 | Profissional | Abre uma subpágina (ex.: questão) | A trilha mostra a seção como link e o título da página |
| 3 | Aluno | Entra no sistema | Vê a barra superior com Minhas provas, Resultados e Contestações; a conta fica no menu do avatar |
| 4 | Aluno | Faz uma prova | Vê o cartão da questão, as opções com letras em círculo, o cronômetro lilás e o cartão "Seu progresso"; no envio, o diálogo "Pronta para enviar?" |
| 5 | Implantação | Personaliza a instituição | Define `NOME_INSTITUICAO` e `URL_AJUDA` e refaz a imagem do frontend |

## Funcionamento

**Base compartilhada**
- **Tokens e fonte:** tokens em `src/index.css`; fonte Inter servida pelo próprio app.
- **Componentes do design system ajustados:** `Tabs` (contador entre parênteses), `DataTable` (paginação numerada e "Mostrando 1–6 de N"), `Stepper` (pílulas), `AlertBanner` (com ícone) e `Timer` (caixa lilás).
- **Componentes novos:** `Metrica`, `Interruptor`, `ColunasChart` e `Icone`.
- **Layouts:** `LayoutProfissional` (menu lateral, topo com trilha, sino e menu do usuário) e `LayoutAluno` (`BarraAluno`, também usada sem navegação na execução da prova). O `Navbar` antigo foi removido.

**Páginas.** Cada uma segue a tela do Figma correspondente, sempre com dados reais:

| Página | O que mudou |
|---|---|
| Dashboard | Saudação por horário ("Bom dia, Ana"), cartões de métrica, provas recentes, gráfico de colunas por turma, atividades recentes (notificações) |
| Banco de questões | Busca com lupa, filtros sem rótulo visível, filtros ativos em chips, tabela Questão/Tipo/Dificuldade/Estado. Editor em duas colunas (conteúdo + "Metadados") |
| Provas | Métricas, abas, tabela com "Gerenciar"/"Continuar" |
| Montagem | Seções com linhas numeradas e botões de subir, descer e remover; resumo lateral com aviso de equilíbrio dos pesos; seletor do banco com o cartão lilás "Sua seleção" |
| Configuração da prova | Toggles para as regras e resumo lilás atualizado em tempo real |
| Aplicações | Métricas, abas e tabela; no acompanhamento, cartão lilás com PIN e link |
| Turmas | Grade de cartões. No detalhe: alunos com participação e média, avaliações da turma e a aba "Dados da turma" (edição de nome e período sobre o `PUT /turmas/:id`, que já existia e não tinha tela) |
| Correções | Fila "Respostas pendentes" ao lado da correção; abas por questão; resposta do aluno, resposta esperada, critérios de pontuação e feedback |
| Recursos | Abas Pendentes, Em análise, Concluídos e Todos. No detalhe: fila de análise, "Contestação do aluno", "Contexto da questão" e "Decisão do recurso" |
| Relatórios | Métricas, nota média por turma, distribuição das notas e resultados por avaliação. Relatórios por prova, turma e aluno no mesmo estilo |
| Usuários | Métricas por papel, busca, filtro por papel e cartão "Papéis profissionais". O detalhe tem os cartões laterais "Situação" e "Segurança" |
| Configurações / Minha conta | Abas Segurança, Notificações e Privacidade e dados; cartões laterais "Sua conta" e "Segurança" |
| Aluno: painel | "Olá, Nome 👋", cartão da prova em andamento com barra de progresso, abas e cartões de prova |
| Aluno: execução | Ver caso de uso 4. As orientações do Figma ficaram no diálogo de início |
| Aluno: resultado | Cartão lilás "Seu resultado", resumo de acertos, revisão por questão e navegação lateral |
| Aluno: contestações | Questão contestada, pedido, acompanhamento por etapas e prazo |

## Interface

As rotas não mudaram. Dois itens do menu foram renomeados:
- "Painel" agora é "Dashboard".
- No ambiente do aluno, "Recursos" agora é "Contestações".

"Configurações" no menu profissional leva a `/app/conta`.

## Configuração

| Variável (`.env`) | Padrão | Efeito |
|---|---|---|
| `NOME_INSTITUICAO` | `Unima` | Nome no menu lateral e no início da trilha |
| `URL_AJUDA` | vazio | Link "Central de ajuda". Vazio oculta o cartão |

As duas entram no bundle durante o build (`VITE_NOME_INSTITUICAO` e `VITE_URL_AJUDA` no `apps/web/Dockerfile`). Depois de alterá-las, rode `docker compose build nginx`.

## Testes

- **Unitários:**
  - `src/design-system/componentes-figma.test.tsx`: paginação numerada, `Interruptor`, `Metrica`, `Stepper`, `Tabs`.
  - `src/layouts/LayoutProfissional.test.tsx`: menu por papel, trilha, título da subpágina, "Sair".
- **Testes existentes:** os de execução, comprovante e login continuam passando sem alteração.
- **E2E:** `e2e/apoio.ts` passou a esperar a saudação por horário no painel profissional. Os nomes acessíveis usados pelo `ciclo-completo` e pelo `recursos-avancados` foram mantidos.

## Pendências e limitações

Implementados depois (2026-10-27, AJ-115): filtros do banco por tipo e dificuldade, "Salvar e avançar" na correção e "Marcar para revisar" na execução.

Itens do Figma sem suporte na API, por isso não implementados:
- **Instituição:**
  - seletor de instituição;
  - formulários "Dados da instituição" e "Padrões de avaliação".
- **Questões:**
  - código da questão (MAT-001), série, tags, título interno e comentário do gabarito;
  - importação de questões.
- **Provas e relatórios:**
  - pontos absolutos ("1,0 ponto"): o sistema usa peso em %;
  - filtros por bimestre, turma e disciplina nas provas e nos relatórios;
  - exportação do relatório geral.
- **Turmas e usuários:**
  - disciplina da turma;
  - convites pendentes de usuários e coluna de último acesso na **lista** (o último acesso aparece, com dado real, na ficha do usuário).
- **Correções e recursos:**
  - código do recurso (REC-026), motivo e anexo da contestação.
- **Aluno:**
  - explicação do gabarito.

Diferenças de fluxo em relação ao Figma:
- A tela "Configurar aplicação" do Figma ficou dividida entre dois lugares do sistema. As regras da prova estão em `FormParametros`. Turma, período e duração estão no diálogo "Aplicar prova" do detalhe da prova, que não foi redesenhado.
- O painel profissional busca o relatório de cada turma (até 12) para o gráfico "Desempenho por turma". Em instituições com muitas turmas, vale um endpoint agregado.
- **Verificação visual parcial:**
  - A execução da prova, a montagem com rascunho e o formulário de decisão de recurso aberto foram verificados só pelo código e pelos testes unitários. O seed não tem esses estados, e criá-los alteraria os dados de demonstração.
  - As telas de administração foram vistas só com dados simulados no navegador, porque o admin do seed exige cadastrar o MFA no primeiro login.
- O Figma escreve "Quizzier"; o produto continua "Quizzer" (ADR-0053).
