export type Papel = 'ADMINISTRADOR' | 'COORDENADOR' | 'PROFESSOR' | 'CORRETOR' | 'ALUNO'
export type Ambiente = 'PROFISSIONAL' | 'ALUNO'

export interface Usuario {
  id: string
  nome: string
  email: string
  matricula: string | null
  papel: Papel
  mfaHabilitado: boolean
  trocarSenha: boolean
  /** Permissões delegadas (RF02). */
  permissoes?: string[]
  notificacoesPorEmail?: boolean
  /** Falta registrar ciência da política de privacidade vigente. */
  politicaPendente?: boolean
}

export interface UsuarioSessao extends Usuario {
  ambiente: Ambiente
}

export type RespostaLogin =
  | { status: 'AUTENTICADO'; accessToken: string; usuario: UsuarioSessao }
  | { status: 'MFA_REQUERIDO' | 'MFA_CADASTRO_REQUERIDO'; mfaToken: string }

export interface DadosCadastroMfa {
  otpauthUri: string
  qrCodeDataUrl: string
  segredo: string
}

export interface Pagina<T> {
  total: number
  pagina: number
  tamanho: number
  itens: T[]
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  ADMINISTRADOR: 'Administrador',
  COORDENADOR: 'Coordenador',
  PROFESSOR: 'Professor',
  CORRETOR: 'Corretor',
  ALUNO: 'Aluno',
}

// ------------------------------------------------------------------ domínio

export type Natureza = 'FECHADA' | 'ABERTA'
export type FormatoQuestao =
  | 'MULTIPLA_ESCOLHA'
  | 'MULTIPLA_RESPOSTA'
  | 'VERDADEIRO_FALSO'
  | 'RESPOSTA_CURTA'
  | 'RESPOSTA_NUMERICA'
  | 'ASSOCIACAO'
  | 'ORDENACAO'
  | 'DISSERTATIVA'
export type ExibicaoGabarito = 'NUNCA' | 'APOS_CORRECAO' | 'APOS_ENCERRAMENTO'

export interface Midia {
  id: string
  tipo: 'IMAGEM' | 'AUDIO' | 'FORMULA'
  url: string
  nomeOriginal: string
}

/** Múltipla escolha/V-F: alternativa correta · resposta curta: respostas aceitas. */
export interface Gabarito {
  alternativaId?: string
  alternativaIds?: string[]
  respostasAceitas?: string[]
  valor?: number
  tolerancia?: number
  /** Associação: item → opção. */
  pares?: Record<string, string>
  /** Ordenação: ids na ordem certa. */
  ordem?: string[]
}
export type Dificuldade = 'FACIL' | 'MEDIO' | 'DIFICIL'
export type StatusQuestao = 'RASCUNHO' | 'EM_REVISAO' | 'PUBLICADA' | 'ARQUIVADA'
export type StatusProva = 'RASCUNHO' | 'PUBLICADA' | 'ARQUIVADA'
export type StatusTentativa = 'EM_ANDAMENTO' | 'ENVIADA' | 'EXPIRADA' | 'REABERTA' | 'INVALIDADA'
export type StatusNota = 'PENDENTE_CORRECAO_MANUAL' | 'CONSOLIDADA'
export type StatusAprovacao = 'APROVADO' | 'REPROVADO' | 'SEM_CRITERIO'
export type StatusRecurso = 'ABERTO' | 'EM_ANALISE' | 'DEFERIDO' | 'INDEFERIDO'
export type SituacaoJanela = 'AGENDADA' | 'DISPONIVEL' | 'ENCERRADA'

export interface Alternativa {
  id: string
  texto: string
  /** Associação: ITEM (coluna A) ou OPCAO (coluna B). */
  grupo?: 'ITEM' | 'OPCAO'
}

/** Rubrica da dissertativa; `itens` = critérios com pontos (lote 8). */
export interface Rubrica {
  criterios: string
  itens?: { descricao: string; pontos: number }[]
}

export interface SecaoProva {
  id: string
  titulo: string
  ordem: number
  modo: 'FIXA' | 'SORTEIO'
  sortear: number | null
  peso: number | null
  notaMinima: number | null
}

export interface NotaSecao {
  id: string
  titulo: string
  nota: number
  notaMinima: number | null
  atingiu: boolean | null
}

export interface QuestaoResumo {
  id: string
  disciplina: string
  topico: string | null
  dificuldade: Dificuldade
  natureza: Natureza
  formato: FormatoQuestao
  altoRisco: boolean
  versaoPendente: boolean
  statusAtual: StatusQuestao
  autorId: string
  autorNome: string
  atualizadoEm: string
  versaoVigente: { id: string; numeroVersao: number; enunciado: string }
}

export interface VersaoQuestao {
  id: string
  numeroVersao: number
  enunciado: string
  alternativas: Alternativa[] | null
  gabarito: Gabarito | null
  rubrica: Rubrica | null
  pendente: boolean
  midias: Midia[]
  criadoPorNome: string
  criadoEm: string
}

export interface QuestaoDetalhe {
  id: string
  disciplina: string
  topico: string | null
  dificuldade: Dificuldade
  natureza: Natureza
  formato: FormatoQuestao
  altoRisco: boolean
  statusAtual: StatusQuestao
  autorId: string
  autorNome: string
  revisadoPorNome: string | null
  comentarioRevisao: string | null
  publicadaEm: string | null
  versoes: VersaoQuestao[]
  podeEditar: boolean
  podeRevisar: boolean
  versaoPendenteId: string | null
  podeAprovarVersao: boolean
  podeMarcarAltoRisco: boolean
}

export interface Turma {
  id: string
  nome: string
  periodoInicio: string
  periodoFim: string
  professorResponsavelId: string
  professorNome: string
  coProfessores: string[]
  souResponsavel: boolean
  totalAlunos: number
}

export interface AlunoResumo {
  id: string
  nome: string
  email: string
  matricula: string | null
  dataVinculo?: string
}

export interface TurmaDetalhe extends Omit<Turma, 'totalAlunos' | 'coProfessores' | 'souResponsavel'> {
  coProfessores: { id: string; nome: string; email: string }[]
  podeGerirProfessores: boolean
  alunos: AlunoResumo[]
}

export interface ProfessorOpcao {
  id: string
  nome: string
  email: string
  papel: Papel
}

export interface RelatorioImportacao {
  totalLinhas: number
  matriculados: number
  jaMatriculados: number
  criados: { linha: number; nome: string; email: string; senhaTemporaria: string }[]
  erros: { linha: number; mensagem: string }[]
}

export interface CriterioAprovacao {
  tipo: 'NOTA_MINIMA' | 'NENHUM'
  valor?: number
}

export interface ParametrosProva {
  titulo: string
  descricao?: string | null
  visibilidade: 'PUBLICA' | 'PRIVADA'
  criterioAprovacao: CriterioAprovacao
  tempoLimiteMin: number | null
  tentativasPermitidas: number
  modoNavegacao: 'SEQUENCIAL' | 'LIVRE'
  ordemQuestoes: 'FIXA' | 'RANDOMIZADA'
  exigeMfa?: boolean
  exibirGabarito?: ExibicaoGabarito
  prazoRecursoDias?: number | null
  correcaoAsCegas?: boolean
  /** Sem campo no formulário; preservados ao salvar para o PUT não voltar ao padrão. */
  correcaoDupla?: boolean
  limiarDivergencia?: number
  sugestaoIa?: boolean
  tempoPorQuestaoSeg?: number | null
}

export interface ProvaResumo extends ParametrosProva {
  id: string
  status: StatusProva
  autorNome: string
  totalQuestoes: number
  somaPesos: number
  atualizadoEm: string
}

export interface ItemProva {
  versaoQuestaoId: string
  ordem: number
  peso: number
  questaoId: string | null
  numeroVersao: number | null
  enunciado: string
  natureza: Natureza | null
  formato: FormatoQuestao | null
  midias: Midia[]
  /** Número da versão vigente quando é mais nova que a usada na prova. */
  versaoMaisNova?: number | null
  secaoId: string | null
  disciplina: string | null
  dificuldade: Dificuldade | null
  alternativas: Alternativa[] | null
  gabarito: Gabarito | null
  rubrica: Rubrica | null
}

export interface ProvaDetalhe extends ParametrosProva {
  id: string
  status: StatusProva
  publicadaEm: string | null
  itens: ItemProva[]
  somaPesos: number
  secoes: SecaoProva[]
  corretoresIds: string[]
  questoesPorParticipante: number
}

export interface AplicacaoResumo {
  id: string
  provaId: string
  provaTitulo: string
  turmaId: string | null
  turmaNome: string | null
  destinoTipo: 'TURMA' | 'ALUNO_AVULSO' | 'PUBLICO'
  janelaInicio: string
  janelaFim: string
  pinAcesso: string | null
  alunosSelecionados?: number
  situacao: SituacaoJanela
  participantes: number
  emAndamento: number
  finalizadas: number
}

export interface NotaResumida {
  id: string
  status: StatusNota
  notaFinal: string | null
  notaProvisoria: string | null
  statusAprovacao: StatusAprovacao | null
}

export interface TentativaAcompanhamento {
  id: string
  numero: number
  status: StatusTentativa
  inicioEm: string
  prazoEm: string
  fimEm: string | null
  trocasSessao: number
  saidasDeFoco: number
  nota: NotaResumida | null
}

export interface EventosTentativa {
  tentativaId: string
  inicioEm: string
  fimEm: string | null
  saidasDeFoco: number
  trocasSessao: number
  eventos: { tipo: 'SAIU_DA_PROVA' | 'VOLTOU_A_PROVA'; ocorridoEm: string }[]
}

export interface AplicacaoDetalhe extends Omit<AplicacaoResumo, 'participantes' | 'emAndamento' | 'finalizadas'> {
  provaTentativasPermitidas: number
  participantes: {
    chave: string
    usuarioId: string | null
    nome: string
    email: string
    matriculaAtiva: boolean | null
    tentativas: TentativaAcompanhamento[]
  }[]
}

export interface ProvaDoAluno {
  aplicacaoId: string
  provaTitulo: string
  provaDescricao: string | null
  turmaNome: string
  tempoLimiteMin: number | null
  totalQuestoes: number
  janelaInicio: string
  janelaFim: string
  situacao: SituacaoJanela
  tentativasPermitidas: number
  tentativasUsadas: number
  tentativaEmAndamentoId: string | null
  ultimaTentativaId: string | null
  podeIniciar: boolean
}

export interface QuestaoExecucao {
  versaoQuestaoId: string
  ordem: number
  natureza: Natureza
  formato?: FormatoQuestao
  secaoTitulo?: string | null
  enunciado: string
  alternativas: Alternativa[] | null
  midias?: Midia[]
}

export interface ValorResposta {
  alternativaId?: string | null
  pares?: Record<string, string> | null
  ordem?: string[] | null
  alternativaIds?: string[] | null
  texto?: string | null
}

export interface ExecucaoPayload {
  tentativa: {
    id: string
    numero: number
    status: StatusTentativa
    inicioEm: string
    prazoEm: string
    fimEm: string | null
  }
  agora: string
  prova: { titulo: string; modoNavegacao: 'SEQUENCIAL' | 'LIVRE' }
  questoes: QuestaoExecucao[]
  respostas: Record<string, ValorResposta>
}

export interface Comprovante {
  codigo: string
  tentativaId: string
  numero: number
  provaTitulo: string
  participanteNome: string
  participanteEmail: string
  status: StatusTentativa
  inicioEm: string
  fimEm: string
  respostasRegistradas: number
  totalQuestoes: number
  emitidoEm: string
  certificado: boolean
  resultado:
    | { notaFinal: string; statusAprovacao: StatusAprovacao; notaId: string }
    | { pendente: true }
    | null
}

export interface CorrecaoQuestao {
  id: string
  versaoQuestaoId: string
  ordem: number
  natureza: Natureza
  formato?: FormatoQuestao
  peso: string
  enunciado: string
  alternativas: Alternativa[] | null
  midias?: Midia[] | null
  gabarito: Gabarito | null
  rubrica: Rubrica | null
  resposta: ValorResposta | null
  fracao: string | null
  automatica: boolean
  feedback: string | null
  anulacao: { politica: string; justificativa: string } | null
  avaliacaoItens?: { descricao: string; pontos: number; maximo: number }[] | null
  secaoId?: string | null
}

export interface NotaDetalhe {
  id: string
  tentativaId: string
  provaId: string
  provaTitulo: string
  participanteNome: string
  participanteEmail: string
  tentativaNumero: number
  certificado: boolean
  inicioEm: string
  fimEm: string
  status: StatusNota
  notaProvisoria: string | null
  notaFinal: string | null
  statusAprovacao: StatusAprovacao | null
  questoes: CorrecaoQuestao[]
  /** Correção às cegas: nome mascarado até consolidar (lote 8). */
  asCegas?: boolean
  notasSecao?: NotaSecao[] | null
}

export interface PendenteCorrecao {
  notaId: string
  provaId: string
  provaTitulo: string
  participanteNome: string
  asCegas?: boolean
  tentativaNumero: number
  fimEm: string
  questoesPendentes: number
}

export interface ResultadoAlunoResumo {
  id: string
  provaTitulo: string
  tentativaNumero: number
  fimEm: string
  status: StatusNota
  notaFinal: string | null
  notaProvisoria: string | null
  statusAprovacao: StatusAprovacao | null
}

export interface ResultadoAluno extends ResultadoAlunoResumo {
  inicioEm: string
  criterioAprovacao: CriterioAprovacao
  exibirGabarito: ExibicaoGabarito
  gabaritoVisivel: boolean
  gabaritoDisponivelEm: string | null
  prazoRecursoAte: string | null
  recursoEncerrado: boolean
  notasSecao?: NotaSecao[] | null
  questoes: {
    versaoQuestaoId: string
    ordem: number
    natureza: Natureza
    formato?: FormatoQuestao
    peso: string
    enunciado: string
    alternativas: Alternativa[] | null
    midias?: Midia[] | null
    gabarito: Gabarito | null
    rubrica: Rubrica | null
    resposta: ValorResposta | null
    fracao: string | null
    feedback: string | null
    anulacao: { politica: string; justificativa: string } | null
  }[]
}

export interface Recurso {
  id: string
  notaId: string
  provaId: string
  versaoQuestaoId: string
  alunoId: string
  justificativa: string
  status: StatusRecurso
  decisao: string | null
  efeito: string | null
  decididoEm: string | null
  criadoEm: string
  encaminhadoEm?: string | null
  motivoEncaminhamento?: string | null
  provaTitulo: string
  participanteNome: string
  questaoOrdem: number | null
  questaoEnunciado: string
}

export interface RecursoDetalhe extends Omit<Recurso, 'questaoOrdem' | 'questaoEnunciado'> {
  notaFinal: string | null
  notaStatus: StatusNota
  questao: CorrecaoQuestao | undefined
  anulacao: { politica: string; justificativa: string } | null
}

export interface ResumoRelatorio {
  participantes: number
  consolidadas: number
  pendentes: number
  media: number | null
  mediana: number | null
  minima: number | null
  maxima: number | null
  aprovados: number
  taxaAprovacao: number | null
  tempoMedioMin: number | null
  distribuicao: { faixa: string; quantidade: number }[]
}

export interface DesempenhoDisciplina {
  disciplina: string
  questoesCorrigidas: number
  participantes: number
  taxaAcerto: number
}

export interface Indicio {
  notaId: string
  nome: string
  motivos: { codigo: string; descricao: string }[]
}

export interface RelatorioProva {
  provaId: string
  provaTitulo: string
  resumo: ResumoRelatorio
  disciplinas: DesempenhoDisciplina[]
  indicios: Indicio[]
  questoes: {
    versaoQuestaoId: string
    ordem: number
    natureza: Natureza
    peso: number
    enunciado: string
    corrigidas: number
    taxaAcerto: number | null
    anulada: boolean
  }[]
  participantes: {
    notaId: string
    nome: string
    email: string
    tentativa: number
    status: StatusNota
    nota: number | null
    statusAprovacao: StatusAprovacao | null
    duracaoMin: number
    fimEm: string
    certificado: boolean
  }[]
}

export interface RelatorioTurma {
  turmaId: string
  turmaNome: string
  provas: { id: string; titulo: string }[]
  alunos: {
    alunoId: string
    nome: string
    email: string
    matricula: string | null
    provasRealizadas: number
    media: number | null
    notas: Record<string, number | null>
  }[]
  resumo: ResumoRelatorio
  disciplinas: DesempenhoDisciplina[]
}

export interface RelatorioAluno {
  alunoId: string
  nome: string
  media: number | null
  resumo: ResumoRelatorio
  provas: (RelatorioProva['participantes'][number] & { provaId: string; provaTitulo: string })[]
  disciplinas: DesempenhoDisciplina[]
}

export interface SessaoAtiva {
  id: string
  ambiente: Ambiente
  ip: string | null
  userAgent: string | null
  criadoEm: string
  ultimoUsoEm: string
  atual: boolean
}

export interface PermissaoCatalogo {
  codigo: string
  descricao: string
}

export interface PermissaoConcedida {
  permissao: string
  descricao: string
  concedidoPor: string
  criadoEm: string
  expiraEm: string | null
  expirada: boolean
}

export interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  link: string | null
  lida: boolean
  criadoEm: string
}

export interface EventoAuditoria {
  id: string
  usuarioId: string | null
  acao: string
  recurso: string
  recursoId: string | null
  justificativa: string | null
  dados: unknown
  ip: string | null
  criadoEm: string
  usuarioNome?: string | null
}

export const ROTULO_FORMATO: Record<FormatoQuestao, string> = {
  MULTIPLA_ESCOLHA: 'Múltipla escolha',
  MULTIPLA_RESPOSTA: 'Várias corretas',
  RESPOSTA_NUMERICA: 'Resposta numérica',
  ASSOCIACAO: 'Associação de colunas',
  ORDENACAO: 'Ordenação',
  VERDADEIRO_FALSO: 'Verdadeiro ou falso',
  RESPOSTA_CURTA: 'Resposta curta',
  DISSERTATIVA: 'Dissertativa',
}

export const ROTULO_EXIBICAO_GABARITO: Record<ExibicaoGabarito, string> = {
  NUNCA: 'Nunca mostrar o gabarito',
  APOS_CORRECAO: 'Mostrar quando o resultado for publicado',
  APOS_ENCERRAMENTO: 'Mostrar depois que a aplicação encerrar',
}

export function formatoDaQuestao(q: { natureza: Natureza | null; formato?: FormatoQuestao | null }): FormatoQuestao {
  return q.formato ?? (q.natureza === 'ABERTA' ? 'DISSERTATIVA' : 'MULTIPLA_ESCOLHA')
}

export const ROTULO_NATUREZA: Record<Natureza, string> = { FECHADA: 'Fechada', ABERTA: 'Aberta' }
export const ROTULO_DIFICULDADE: Record<Dificuldade, string> = { FACIL: 'Fácil', MEDIO: 'Médio', DIFICIL: 'Difícil' }
export const ROTULO_STATUS_QUESTAO: Record<StatusQuestao, string> = {
  RASCUNHO: 'Rascunho',
  EM_REVISAO: 'Em revisão',
  PUBLICADA: 'Publicada',
  ARQUIVADA: 'Arquivada',
}
export const ROTULO_STATUS_PROVA: Record<StatusProva, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADA: 'Publicada',
  ARQUIVADA: 'Arquivada',
}
export const ROTULO_TENTATIVA: Record<StatusTentativa, string> = {
  EM_ANDAMENTO: 'Em andamento',
  ENVIADA: 'Enviada',
  EXPIRADA: 'Enviada (tempo esgotado)',
  REABERTA: 'Reaberta',
  INVALIDADA: 'Invalidada',
}
export const ROTULO_NOTA: Record<StatusNota, string> = {
  PENDENTE_CORRECAO_MANUAL: 'Aguardando correção',
  CONSOLIDADA: 'Corrigida',
}
export const ROTULO_APROVACAO: Record<StatusAprovacao, string> = {
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  SEM_CRITERIO: 'Sem critério',
}
export const ROTULO_RECURSO: Record<StatusRecurso, string> = {
  ABERTO: 'Aberto',
  EM_ANALISE: 'Em análise',
  DEFERIDO: 'Deferido',
  INDEFERIDO: 'Indeferido',
}
export const ROTULO_JANELA: Record<SituacaoJanela, string> = {
  AGENDADA: 'Agendada',
  DISPONIVEL: 'Disponível',
  ENCERRADA: 'Encerrada',
}

export interface UsuarioListagem extends Usuario {
  ativo: boolean
  bloqueado: boolean
}

export interface UsuarioAdmin extends Usuario {
  ativo: boolean
  bloqueadoAte: string | null
  tentativasLoginFalha: number
  ultimoLoginEm: string | null
  criadoEm: string
  sessoesAtivas: number
}

export type StatusSolicitacaoLgpd = 'PENDENTE' | 'CONCLUIDA' | 'RECUSADA'

export interface SolicitacaoLgpd {
  id: string
  status: StatusSolicitacaoLgpd
  tipo?: 'EXCLUSAO' | 'CORRECAO'
  dadosCorrigidos?: { nome?: string; matricula?: string } | null
  justificativa: string | null
  resposta: string | null
  criadoEm: string
  concluidaEm: string | null
}

export interface SolicitacaoLgpdAdmin extends SolicitacaoLgpd {
  usuarioId: string
  titularNome: string
  titularEmail: string
  titularPapel: Papel
  prazoResposta: string
}

export const ROTULO_LGPD: Record<StatusSolicitacaoLgpd, string> = {
  PENDENTE: 'Em análise',
  CONCLUIDA: 'Atendida',
  RECUSADA: 'Recusada',
}

/** A alternativa é (uma das) correta(s)? Funciona para múltipla escolha, V/F e várias corretas. */
export function alternativaCorreta(g: Gabarito | null | undefined, id: string): boolean {
  return !!g && (g.alternativaId === id || !!g.alternativaIds?.includes(id))
}

/** Texto do gabarito numérico: "3,14 (± 0,01)". */
export function descreverNumerico(g: Gabarito | null | undefined): string | null {
  if (g?.valor == null) return null
  const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 10 })
  return g.tolerancia ? `${n(g.valor)} (± ${n(g.tolerancia)})` : n(g.valor)
}

export interface ChaveIntegracao {
  id: string
  nome: string
  prefixo: string
  escopos: string[]
  criadoEm: string
  expiraEm: string | null
  ultimoUsoEm: string | null
  revogadaEm: string | null
  ativa: boolean
}
