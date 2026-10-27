import { createBrowserRouter } from 'react-router'
import { PAPEIS_AUTORIA, PAPEIS_CORRECAO } from './auth/papeis'
import { RotaProtegida } from './auth/RotaProtegida'
import { LayoutAluno } from './layouts/LayoutAluno'
import { LayoutProfissional } from './layouts/LayoutProfissional'
import { ComprovanteAluno } from './paginas/aluno/ComprovanteAluno'
import { ExecucaoAluno } from './paginas/aluno/Execucao'
import { PainelAluno } from './paginas/aluno/Painel'
import { RecursosAluno, ResultadoDetalheAluno, ResultadosAluno } from './paginas/aluno/Resultados'
import { LoginAluno } from './paginas/auth/LoginAluno'
import { LoginProfissional } from './paginas/auth/LoginProfissional'
import { EsqueciSenha, RedefinirSenha } from './paginas/auth/RecuperarSenha'
import { TrocarSenha } from './paginas/auth/TrocarSenha'
import { VerificacaoMfa } from './paginas/auth/VerificacaoMfa'
import { AcessoNegado, NaoEncontrado } from './paginas/Erros'
import { Inicio } from './paginas/Inicio'
import { MinhaConta } from './paginas/MinhaConta'
import { AceiteTermos, PaginaPrivacidade, PaginaTermos } from './paginas/Legal'
import { ComprovantePublico, EntradaPin, ExecucaoPublica, InicioPublico } from './paginas/publico/Publico'
import {
  Integracoes,
  Lgpd,
  AcompanhamentoAplicacao,
  ListaAplicacoes,
  Auditoria,
  FilaCorrecao,
  TelaCorrecao,
  PainelProfissional,
  EditarProva,
  NovaProva,
  DetalheProva,
  ImpressaoProva,
  ListaProvas,
  DetalheQuestao,
  EditarQuestao,
  NovaQuestao,
  ListaQuestoes,
  DetalheRecurso,
  ListaRecursos,
  RelatorioDeAluno,
  RelatorioDeProva,
  RelatorioDeTurma,
  Relatorios,
  DetalheTurma,
  ListaTurmas,
  DetalheUsuario,
  Usuarios,
} from './paginas-sob-demanda'


export const rotas = [
  { path: '/', element: <Inicio /> },

  // Rotas públicas
  { path: '/login', element: <LoginProfissional /> },
  { path: '/aluno/login', element: <LoginAluno /> },
  { path: '/mfa', element: <VerificacaoMfa /> },
  { path: '/trocar-senha', element: <TrocarSenha /> },
  { path: '/esqueci-senha', element: <EsqueciSenha ambiente="PROFISSIONAL" /> },
  { path: '/aluno/esqueci-senha', element: <EsqueciSenha ambiente="ALUNO" /> },
  { path: '/redefinir-senha', element: <RedefinirSenha ambiente="PROFISSIONAL" /> },
  { path: '/aluno/redefinir-senha', element: <RedefinirSenha ambiente="ALUNO" /> },
  { path: '/acesso-negado', element: <AcessoNegado /> },
  { path: '/termos', element: <PaginaTermos /> },
  { path: '/privacidade', element: <PaginaPrivacidade /> },

  // Prova pública por PIN/link (sem login)
  { path: '/p', element: <EntradaPin /> },
  { path: '/p/:pin', element: <InicioPublico /> },
  { path: '/p/:pin/prova/:id', element: <ExecucaoPublica /> },
  { path: '/p/:pin/comprovante/:id', element: <ComprovantePublico /> },

  // Ambiente profissional
  {
    path: '/app',
    element: <RotaProtegida ambiente="PROFISSIONAL" />,
    children: [
      // Aceite dos Termos e da Política (ADR-0060), fora do layout
      { path: 'aceite-termos', element: <AceiteTermos /> },
      {
        element: <LayoutProfissional />,
        children: [
          { index: true, element: <PainelProfissional /> },
          { path: 'conta', element: <MinhaConta /> },
          {
            element: (
              <RotaProtegida ambiente="PROFISSIONAL" papeis={['ADMINISTRADOR', 'COORDENADOR']} permissao="DESBLOQUEAR_CONTAS" />
            ),
            children: [
              { path: 'usuarios', element: <Usuarios /> },
              { path: 'usuarios/:id', element: <DetalheUsuario /> },
            ],
          },
          {
            element: <RotaProtegida ambiente="PROFISSIONAL" papeis={['ADMINISTRADOR']} permissao="CONSULTAR_AUDITORIA" />,
            children: [{ path: 'auditoria', element: <Auditoria /> }],
          },
          {
            element: <RotaProtegida ambiente="PROFISSIONAL" papeis={['ADMINISTRADOR']} />,
            children: [
              { path: 'lgpd', element: <Lgpd /> },
              { path: 'integracoes', element: <Integracoes /> },
            ],
          },
          {
            element: <RotaProtegida ambiente="PROFISSIONAL" papeis={PAPEIS_AUTORIA} />,
            children: [
              { path: 'questoes', element: <ListaQuestoes /> },
              { path: 'questoes/nova', element: <NovaQuestao /> },
              { path: 'questoes/:id', element: <DetalheQuestao /> },
              { path: 'questoes/:id/editar', element: <EditarQuestao /> },
              { path: 'turmas', element: <ListaTurmas /> },
              { path: 'turmas/:id', element: <DetalheTurma /> },
              { path: 'provas', element: <ListaProvas /> },
              { path: 'provas/nova', element: <NovaProva /> },
              { path: 'provas/:id', element: <DetalheProva /> },
              { path: 'provas/:id/editar', element: <EditarProva /> },
              { path: 'provas/:id/imprimir', element: <ImpressaoProva /> },
              { path: 'aplicacoes', element: <ListaAplicacoes /> },
              { path: 'aplicacoes/:id', element: <AcompanhamentoAplicacao /> },
              { path: 'recursos', element: <ListaRecursos /> },
              { path: 'recursos/:id', element: <DetalheRecurso /> },
              { path: 'relatorios', element: <Relatorios /> },
              { path: 'relatorios/provas/:id', element: <RelatorioDeProva /> },
              { path: 'relatorios/alunos/:id', element: <RelatorioDeAluno /> },
              { path: 'relatorios/turmas/:id', element: <RelatorioDeTurma /> },
            ],
          },
          {
            element: <RotaProtegida ambiente="PROFISSIONAL" papeis={PAPEIS_CORRECAO} />,
            children: [
              { path: 'correcoes', element: <FilaCorrecao /> },
              { path: 'correcoes/:notaId', element: <TelaCorrecao /> },
            ],
          },
        ],
      },
    ],
  },

  // Ambiente do aluno
  {
    path: '/aluno',
    element: <RotaProtegida ambiente="ALUNO" />,
    children: [
      // Execução em tela cheia, sem navegação (foco na prova)
      { path: 'prova/:id', element: <ExecucaoAluno /> },
      { path: 'aceite-termos', element: <AceiteTermos /> },
      {
        element: <LayoutAluno />,
        children: [
          { index: true, element: <PainelAluno /> },
          { path: 'comprovante/:id', element: <ComprovanteAluno /> },
          { path: 'resultados', element: <ResultadosAluno /> },
          { path: 'resultados/:id', element: <ResultadoDetalheAluno /> },
          { path: 'recursos', element: <RecursosAluno /> },
          { path: 'conta', element: <MinhaConta /> },
        ],
      },
    ],
  },

  { path: '*', element: <NaoEncontrado /> },
]

export const roteador = createBrowserRouter(rotas)
