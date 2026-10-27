# Design do frontend (Figma)

As telas de referência estão em [`figma/`](figma/). São exportações do arquivo Figma do projeto, com uma imagem por tela e prefixo `prof-` ou `aluno-` conforme o ambiente. A decisão de adotar esse visual está na [ADR-0053](../adr/0053-identidade-visual-figma.md).

| Tela (Figma) | Página no código |
|---|---|
| 08 Dashboard | `paginas/profissional/Painel.tsx` |
| 02 Banco de Questões | `paginas/profissional/questoes/ListaQuestoes.tsx` |
| 09 Editar questão | `paginas/profissional/questoes/EditorQuestao.tsx` (e `DetalheQuestao.tsx` no mesmo estilo) |
| 10 Provas | `paginas/profissional/provas/ListaProvas.tsx` |
| 14 Montagem da prova | `paginas/profissional/provas/AssistenteProva.tsx`, `ComposicaoSecoes.tsx`, `DetalheProva.tsx` |
| 18 Adicionar questões do banco | seletor de questões dentro de `ComposicaoSecoes.tsx` |
| 03 Configurar aplicação | `paginas/profissional/provas/FormParametros.tsx` (+ `ResumoParametros.tsx`) |
| 11 Turmas | `paginas/profissional/turmas/ListaTurmas.tsx`, `DetalheTurma.tsx` |
| 07 Correções | `paginas/profissional/correcao/FilaCorrecao.tsx`, `TelaCorrecao.tsx` |
| 01 Recursos | `paginas/profissional/recursos/ListaRecursos.tsx`, `DetalheRecurso.tsx` |
| 16 Relatórios | `paginas/profissional/relatorios/Relatorios.tsx` |
| 19 Usuários | `paginas/profissional/Usuarios.tsx`, `DetalheUsuario.tsx` |
| 04 Configurações | `paginas/MinhaConta.tsx`, `ContaSeguranca.tsx` |
| 13 Painel do aluno | `paginas/aluno/Painel.tsx` |
| 12 Orientações da prova | tela inicial de `componentes/execucao/ExecucaoProva.tsx` |
| 15 Execução | `componentes/execucao/ExecucaoProva.tsx` |
| 05 Pronta para enviar | etapa de revisão de `ExecucaoProva.tsx` |
| 17 Resultado | `paginas/aluno/Resultados.tsx` (`ResultadoDetalheAluno`) |
| 06 Contestação | `paginas/aluno/Resultados.tsx` (`RecursosAluno`) |

O Figma usa dados fictícios ("Marina Costa", "Funções e gráficos"). As páginas mostram os dados reais da API. Quando o Figma traz algo que a API não fornece, como a disciplina do professor ou a instituição selecionável, a página omite o elemento em vez de inventar o dado.

## Vocabulário visual

**Tokens.** Ficam em `src/index.css`:
- Primária `#5a50dc`, fundo `#f5f6fa`, borda `#e4e6ee`.
- Fonte Inter, servida pelo próprio app (`@fontsource-variable/inter`, por causa da CSP).
- Raio de 12px nos cartões e de 8px nos controles.

**Componentes** (`src/design-system`):

| Componente | Uso |
|---|---|
| `Card` | Cartão branco. Com `className="qz-cartao--destaque"`, vira o painel lilás de resumo (ex.: "Resumo da aplicação", "Sua seleção"). |
| `Metrica` | Cartão de indicador: rótulo, ícone no canto e valor grande. Agrupe dentro de `<div className="qz-metricas">`. |
| `Tabs` | Abas sublinhadas. O contador aparece como "Pendentes (2)". |
| `DataTable` | Tabela com cabeçalho cinza arredondado e paginação numerada. Use `rotuloItens="questões"` para "Mostrando 1–6 de 248 questões". O subtítulo da célula vai em `<span className="qz-tabela__sub">`. |
| `StatusBadge` | Pílula de status: `neutro`, `info` (lilás), `sucesso`, `alerta` (âmbar), `erro`. |
| `AlertBanner` | Aviso com ícone, título e texto (âmbar, lilás, verde ou vermelho). |
| `Interruptor` | Toggle com título e descrição ("Embaralhar alternativas"). |
| `Stepper` | Pílulas de etapa ligadas por setas ("1. Montagem concluída → 2. Aplicação → …"). |
| `ColunasChart` | Colunas verticais (nota média por turma). |
| `BarChart` | Barras horizontais (distribuição das notas). |
| `Icone` | Ícones de traço. Use dentro de botões (`<Button><Icone nome="mais" /> Nova questão</Button>`). |

**Classes de página** (`src/layouts/layouts.css`):

| Classe | Uso |
|---|---|
| `CabecalhoPagina` | Título de 31px, ações à direita e, opcionalmente, `voltar` ("← Voltar para provas") e `sobretitulo` (badge acima do título). O título também alimenta a trilha do topo. |
| `qz-duas-colunas` | Conteúdo principal + coluna lateral de 310px. |
| `qz-lista-detalhe` | Fila à esquerda (285px) + detalhe à direita. |
| `qz-barra-filtros` | Linha de filtros sem rótulo visível: campo `qz-busca` com lupa + `<select className="qz-seletor" aria-label="…">`. |
| `qz-pilha`, `qz-linha`, `qz-acoes` | Empilhamento vertical, linha flexível e grupo de botões. |

**Configuração.** O nome da instituição (`NOME_INSTITUICAO`) e o link da central de ajuda (`URL_AJUDA`) vêm do `.env` no build do frontend. Com `URL_AJUDA` vazio, o cartão "Precisa de uma mão?" não aparece.
