# ADR-0016: Simplificações de domínio no MVP

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Equipe
- **Requisitos relacionados:** RF04, RF05, RF06, RF07; Tabelas 2–4 do Inventário de Dados
- **Complementa:** [ADR-0005](0005-banco-schemas-por-modulo.md) (os ajustes de schema abaixo foram feitos na migration `20261010180000_sprints_2_a_4`)

## Contexto

Ao implementar as Sprints 2–4 foi preciso fechar regras que o Documento de Requisitos deixa
em aberto ou que dependem das RNs numeradas (anexo ausente — ver `docs/features/README.md`).

## Decisão

**Questões (RF04)**
- Questão **fechada = múltipla escolha com exatamente uma alternativa correta** (2 a 10
  alternativas, ids `A`…`J`; gabarito `{ alternativaId }`). V/F é modelado como 2 alternativas.
  Múltiplas corretas e outros formatos ficam para depois.
- Questão **aberta**: rubrica em texto livre (`{ criterios }`), visível só para quem corrige.
- **Tópico** vira texto livre em `questoes.questoes.topico`; a tabela hierárquica `topicos`
  do ER foi removida até existir uma lista controlada definida pela coordenação.
- **Versionamento**: rascunho nunca publicado é editado no lugar; questão publicada gera nova
  versão a cada edição (anterior preservada). A **natureza não muda** depois de publicada.
  Edição de "alto risco" com aprovação formal (RF04) não foi implementada.
- **Dupla checagem**: qualquer Professor/Coordenador/Admin **diferente do autor** pode aprovar
  ou devolver (com comentário). Não há papel "Validador" separado.
- **Duplicidade**: similaridade de Jaccard sobre palavras normalizadas (sem acento, 3+ letras),
  na mesma disciplina; ≥ 0,8 bloqueia o envio para revisão até o autor confirmar.

**Provas (RF05)**
- Pesos são **pontos percentuais** que devem somar **100%** (tolerância 0,01) para publicar —
  a publicação é **bloqueada** (não há normalização automática; o assistente oferece "distribuir
  igualmente"). Unicidade `(prova_id, ordem)` removida para permitir reordenar.
- Critério de aprovação: `NOTA_MINIMA` (nota 0–10) ou `NENHUM`. "Percentual", "por seção" e
  "combinação" ficam para quando houver seções.
- Prova publicada é imutável; arquivar não afeta aplicações existentes.

**Aplicação (RF06)**
- Destinos implementados: `TURMA` (alunos com matrícula ativa) e `PUBLICO` (PIN). `SUBGRUPO`
  e `ALUNO_AVULSO` existem no enum mas não têm tela/regra.
- **PIN** de prova pública = **código de sala** compartilhado com todos os participantes
  (8 caracteres sem ambíguos, ~39 bits), guardado em texto (`pin_acesso`, único) para o
  professor poder exibi-lo de novo. A proteção é o limitador `pin` (30 req/min por IP — ver
  ADR-0011) e a janela de aplicação. As colunas `pin_acesso_hash`/`pin_expira_em` foram
  removidas: a expiração do PIN é o fim da janela.
- Nota em **escala 0–10** com 2 casas: `Σ(peso × fração) / Σ(peso) × 10`.

## Consequências

- Regras alinhadas ao que o MVP precisa demonstrar; cada simplificação aparece como pendência
  na feature correspondente para revisão contra as RNs.
