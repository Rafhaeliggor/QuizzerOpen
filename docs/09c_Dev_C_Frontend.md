# Dev C — Frontend

**Responsabilidade:** único app React cobrindo as telas dos dois ambientes (Profissional e Aluno), com rotas protegidas por papel.

> 🔁 = item reincorporado ao escopo graças ao apoio de agentes de IA.

> **Situação em 2026-10-27** — além da auditoria de 24/10, a revisão de 26/10 achou três defeitos,
> corrigidos em 27/10 (foco nos diálogos, pacote inicial e erro do sino — BUG-058 a BUG-060). Três
> itens do Figma também foram implementados (filtros do banco, "Salvar e avançar", "Marcar para
> revisar" — AJ-115). A revisão completa de acessibilidade foi adiada. O tema escuro, que tinha ficado
> fora, entrou no mesmo dia a pedido do usuário: Configurações > Aparência, com padrão que segue o
> sistema (AJ-117, ADR-0059, feature 039). Termos de Uso, Política de Privacidade e página de aceite
> obrigatória no primeiro acesso (AJ-118, ADR-0060, feature 040).
>
> **Situação em 2026-10-11** — coluna *Situação* adicionada. Todos os itens foram implementados
> por agente de IA e verificados por testes automatizados; a **revisão humana** exigida pela
> Definição de Pronto (plano, Seção 5) ainda está **pendente para todos os itens**. Visão
> completa: [requisitos-status.md](requisitos-status.md).
>
> **Auditoria em 2026-10-24** — cada tarefa foi conferida contra o código e a API. Todas as telas
> existiam, mas 13 defeitos foram encontrados e corrigidos ([BUG-028 a BUG-040](bugs-corrigidos.md#bug-028)),
> além de três lacunas ([AJ-105 a AJ-107](ajustes-de-percurso.md#aj-105-a-aj-107)). As correções estão citadas
> na coluna *Situação*.

---

## Sprint 1 (Semana 1) — Fundação

| Tarefa | Prazo | Situação |
|---|---|---|
| Setup do projeto React + roteamento (rotas públicas vs. protegidas por papel) | Seg | ✅ [007](features/007-frontend-base-e-design-system.md) |
| Layout base (navbar, sidebar) e componentes de design system (`DataTable`, `StatusBadge`, `AlertBanner`) | Ter | ✅ [007](features/007-frontend-base-e-design-system.md); diálogo com trava de foco e sem perder o campo ao digitar ([BUG-058](bugs-corrigidos.md#bug-058)); telas sob demanda ([BUG-060](bugs-corrigidos.md#bug-060)) |
| Telas de Login (profissional e aluno) | Qua | ✅ [001](features/001-autenticacao-e-sessao.md) |
| 🔁 Tela de verificação MFA (TOTP) | Qui | ✅ [002](features/002-mfa-totp.md) |
| Integração do login + MFA com a API publicada no VPS | Sex | ✅ na stack Docker de homologação (VPS real pendente); logout com token vencido corrigido — [BUG-030](bugs-corrigidos.md#bug-030) |

---

## Sprint 2 (Semana 2) — Banco de Questões, Turmas e Composição de Provas

| Tarefa | Prazo | Situação |
|---|---|---|
| Telas de Banco de Questões (lista + editor) | Seg–Ter | ✅ [008](features/008-banco-de-questoes.md) |
| Telas de Turmas (lista + detalhe) | Qua | ✅ [009](features/009-turmas-e-importacao-csv.md); escolha do professor responsável incluída — [AJ-105](ajustes-de-percurso.md#aj-105-a-aj-107) |
| 🔁 Tela de importação CSV (upload, preview, relatório de erros por linha) | Qui | ✅ [009](features/009-turmas-e-importacao-csv.md) |
| Wizard de criação de prova (dados gerais → seleção manual de questões → parâmetros → publicar) | Sex | ✅ [010](features/010-composicao-de-provas.md); edição do rascunho corrigida — [BUG-028](bugs-corrigidos.md#bug-028) |

---

## Sprint 3 (Semana 3) — Aplicação (Execução) e Correção

| Tarefa | Prazo | Situação |
|---|---|---|
| Tela de acesso por PIN/link + identificação mínima (prova pública) | Seg | ✅ [011](features/011-aplicacao-e-execucao.md) |
| Tela de execução da prova (cronômetro visível, navegação, autosave) | Ter–Qua | ✅ [011](features/011-aplicacao-e-execucao.md) |
| Tela de confirmação de envio + comprovante | Qui | ✅ [011](features/011-aplicacao-e-execucao.md) |
| Tela de correção manual (para corretor/professor) | Sex | ✅ [012](features/012-correcao.md); nota máxima pré-preenchida corrigida — [BUG-029](bugs-corrigidos.md#bug-029) |

---

## Sprint 4 (Semana 4) — Relatórios, Recursos, Auditoria Mínima e Polimento

| Tarefa | Prazo | Situação |
|---|---|---|
| Telas de relatórios (tabelas + exportação) | Seg–Ter | ✅ [014](features/014-relatorios.md); "Limpar período" e erro de exportação corrigidos — [BUG-031](bugs-corrigidos.md#bug-031), [BUG-036](bugs-corrigidos.md#bug-036) |
| Tela de recursos (abrir/acompanhar para aluno; decidir para professor) | Qua | ✅ [013](features/013-recursos.md) |
| 🔁 Sino de notificações in-app (lista + marcar como lida) | Qui | ✅ [015](features/015-notificacoes-e-auditoria.md) |
| Revisão geral de UI/UX, responsividade básica e testes manuais ponta a ponta + correção de bugs | Sex | ✅ Playwright no CI — [007](features/007-frontend-base-e-design-system.md); asserção fraca corrigida e cobertura ampliada — [BUG-037](bugs-corrigidos.md#bug-037) |

---

## Além do plano — lote 6 (2026-10-11)

| Tarefa | Situação |
|---|---|
| Editor de questão com formato, mídias e alto risco; aprovação de versão pendente | ✅ [021](features/021-formatos-midia-e-alto-risco.md) |
| Execução: V/F, resposta curta, mídia e registro de saída da aba | ✅ [021](features/021-formatos-midia-e-alto-risco.md), [024](features/024-politicas-impressao-e-comportamento.md) |
| Parâmetros da prova (gabarito, prazo de recurso, exigir MFA), impressão/PDF e duplicar | ✅ [024](features/024-politicas-impressao-e-comportamento.md) |
| Resultado do aluno com gabarito e prazo de recurso | ✅ [024](features/024-politicas-impressao-e-comportamento.md) |
| *Minha conta*: verificação em duas etapas e sessões abertas | ✅ [023](features/023-mfa-opcional-e-sessoes.md) |
| Permissões delegadas na ficha do usuário; menus por delegação; equipe da turma | ✅ [022](features/022-delegacao-e-co-professores.md); atualização sem novo login — [BUG-032](bugs-corrigidos.md#bug-032) |
| Relatórios com período, por disciplina e página do aluno; auditoria com período e CSV | ✅ [025](features/025-relatorios-avancados-e-auditoria.md) |

## Além do plano — lote 7 (2026-10-12)

| Tarefa | Situação |
|---|---|
| Fórmulas (pré-visualização e exibição), várias corretas e numérica no editor, na prova e nos resultados | ✅ [028](features/028-formulas-e-formatos-avancados.md) |
| Esqueci a senha, redefinição, códigos de recuperação, avisos por e-mail, aviso da política | ✅ [029](features/029-email-e-recuperacao-de-conta.md) |
| Aplicar a alunos escolhidos, transferir aluno, validade da delegação | ✅ [030](features/030-aplicacao-avancada-e-turmas.md); delegação "expirada" visível — [BUG-033](bugs-corrigidos.md#bug-033) |
| Excel, imprimir relatório, cartão de indícios | ✅ [031](features/031-relatorios-excel-e-indicios.md) |

## Além do plano — lote 8 (2026-10-12)

| Tarefa | Situação |
|---|---|
| Composição por seções/sorteio; nota por seção no resultado | ✅ [032](features/032-secoes-e-sorteio.md); banco paginado — [BUG-035](bugs-corrigidos.md#bug-035) |
| Associação e ordenação (editor, prova, correção, resultado, impressão); critérios na correção; encaminhar recurso; corretores designados | ✅ [033](features/033-correcao-avancada-e-formatos-estruturados.md) |
| Sino em tempo real | ✅ [034](features/034-notificacoes-tempo-real-e-fila.md) |
| Tela *Integrações*; pedido de correção (LGPD) e retenção | ✅ [035](features/035-api-de-integracao.md), [036](features/036-lgpd-correcao-e-retencao.md) |

## Além do plano — visual do Figma (2026-10-18)

| Tarefa | Situação |
|---|---|
| Tokens, fonte Inter local, ícones, novos componentes (`Metrica`, `Interruptor`, `ColunasChart`) | ✅ [037](features/037-visual-figma.md) |
| Layout profissional (menu lateral, trilha, menu do usuário) e layout do aluno (barra superior) | ✅ [037](features/037-visual-figma.md) |
| As 19 telas do Figma aplicadas às páginas existentes, com dados reais | ⚠️ [037](features/037-visual-figma.md): elementos sem API ficaram de fora; filtros do banco, "Salvar e avançar" e "Marcar para revisar" implementados (AJ-115) |

## Revisão de 2026-10-26 — corrigido em 2026-10-27

| Item | Situação |
|---|---|
| Campo de diálogo perdendo o foco a cada tecla; Tab escapando | ✅ [BUG-058](bugs-corrigidos.md#bug-058) |
| Pacote inicial de 900 KB | ✅ [BUG-060](bugs-corrigidos.md#bug-060) — 330 KB + 144 KB compartilhado; KaTeX e telas profissionais sob demanda |
| Erro do sino de notificações invisível | ✅ [BUG-059](bugs-corrigidos.md#bug-059) |
| Filtros do banco por tipo/dificuldade, "Salvar e avançar", "Marcar para revisar" (Figma) | ✅ AJ-115 |
| Telas sem teste de navegador (turmas/CSV, acompanhamento, filtros, LGPD do aluno) | ✅ `e2e/telas-gestao.spec.ts`; administração segue só no e2e da API (exige MFA) |
| Conferência visual da montagem de prova | ✅ captura automatizada × Figma 14 |
| Conferência visual da execução do aluno, recurso aberto e administração | ⏳ manual |
| Tema escuro | 🚫 fora do escopo (decisão de 2026-10-27) |
| Revisão completa de acessibilidade | ⏳ adiada (decisão de 2026-10-27) |

| Barras de rolagem minimalistas (só o polegar, cor do tema) | ✅ [AJ-119](ajustes-de-percurso.md#aj-119) |
| Homepage pública em `/` | ✅ [feature 041](features/041-homepage.md), [AJ-120](ajustes-de-percurso.md#aj-120) |
