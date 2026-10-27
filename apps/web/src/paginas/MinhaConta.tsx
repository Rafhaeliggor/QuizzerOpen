import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { api, mensagemDeErro, salvarArquivo } from '../api/cliente'
import { useRecursos } from '../api/recursos'
import { ROTULO_LGPD, ROTULO_PAPEL, type SessaoAtiva, type SolicitacaoLgpd } from '../api/tipos'
import { useAuth } from '../auth/contexto'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina'
import { AlertBanner, Button, Card, DataTable, Dialog, Icone, StatusBadge, Tabs, TextArea, TextField } from '../design-system'
import { formatarDataHora } from '../util/formato'
import { lerTema, salvarTema, type PreferenciaTema } from '../util/tema'
import { CartaoMfa, CartaoPreferencias, CartaoSessoes, type SituacaoMfa } from './ContaSeguranca'
import './conta.css'

type Aba = 'seguranca' | 'notificacoes' | 'aparencia' | 'privacidade'

/**
 * Minha conta / Configurações: segurança, avisos, aparência (tema) e direitos do titular (LGPD, art. 18). Nos dois ambientes.
 * A aba inicial é Segurança (verificação em duas etapas e sessões abertas).
 */
export function MinhaConta() {
  const { usuario } = useAuth()
  const aluno = useLocation().pathname.startsWith('/aluno')
  const recursos = useRecursos()
  const [aba, setAba] = useState<Aba>('seguranca')
  if (!usuario) return null
  const comEmail = !!recursos.data?.emailHabilitado

  return (
    <>
      <CabecalhoPagina titulo={aluno ? 'Minha conta' : 'Configurações'} />
      <Tabs<Aba>
        rotulo="Seções da conta"
        ativa={aba}
        aoMudar={setAba}
        abas={[
          { valor: 'seguranca', rotulo: 'Segurança' },
          ...(comEmail ? [{ valor: 'notificacoes' as const, rotulo: 'Notificações' }] : []),
          { valor: 'aparencia', rotulo: 'Aparência' },
          { valor: 'privacidade', rotulo: 'Privacidade e dados' },
        ]}
      />
      <div className="qz-duas-colunas">
        <div className="qz-pilha">
          {aba === 'seguranca' && (
            <>
              <CartaoMfa />
              <CartaoSessoes />
            </>
          )}
          {aba === 'notificacoes' && <CartaoPreferencias />}
          {aba === 'aparencia' && <CartaoAparencia />}
          {aba === 'privacidade' && <CartaoPrivacidade />}
        </div>
        <div className="qz-pilha">
          <Card className="qz-cta-lateral">
            <h2>Sua conta</h2>
            <StatusBadge status={usuario.papel} tom="info" rotulo={ROTULO_PAPEL[usuario.papel]} />
            <strong className="qz-cta-lateral__nome">{usuario.nome}</strong>
            <span className="qz-cta-lateral__linha">{usuario.email}</span>
            {usuario.matricula && <span className="qz-cta-lateral__linha">Matrícula {usuario.matricula}</span>}
            <p className="qz-cta-lateral__nota">Para corrigir nome, e-mail ou matrícula, procure a secretaria/coordenação.</p>
            <Link to="/trocar-senha" className="qz-botao qz-botao--secundario qz-botao--largo">
              <Icone nome="lapis" /> Trocar minha senha
            </Link>
          </Card>
          <CartaoResumoSeguranca mostrarAtalho={aba !== 'seguranca'} aoGerenciar={() => setAba('seguranca')} />
        </div>
      </div>
    </>
  )
}

/** Resumo lateral: situação da verificação em duas etapas e sessões abertas (mesmas consultas dos cartões). */
function CartaoResumoSeguranca({ mostrarAtalho, aoGerenciar }: { mostrarAtalho: boolean; aoGerenciar: () => void }) {
  const mfa = useQuery({ queryKey: ['minha-conta', 'mfa'], queryFn: () => api<SituacaoMfa>('/minha-conta/mfa') })
  const sessoes = useQuery({ queryKey: ['minha-conta', 'sessoes'], queryFn: () => api<SessaoAtiva[]>('/minha-conta/sessoes') })
  const m = mfa.data
  const total = sessoes.data?.length
  return (
    <Card className="qz-cta-lateral">
      <h2>Segurança</h2>
      {m &&
        (m.habilitado ? (
          <StatusBadge status="PROTEGIDA" tom="sucesso" rotulo="Conta protegida" />
        ) : (
          <StatusBadge status="SO_SENHA" tom={m.obrigatorio ? 'alerta' : 'neutro'} rotulo="Somente senha" />
        ))}
      {(m || total != null) && (
        <p className="qz-cta-lateral__nota">
          {m && (m.habilitado ? 'Verificação em duas etapas ativada. ' : 'Verificação em duas etapas desativada. ')}
          {total != null && `${total} ${total === 1 ? 'sessão conectada' : 'sessões conectadas'}.`}
        </p>
      )}
      {mostrarAtalho && (
        <Button variante="secundario" largo onClick={aoGerenciar}>
          Gerenciar acesso
        </Button>
      )}
    </Card>
  )
}

const OPCOES_TEMA: { valor: PreferenciaTema; rotulo: string; descricao: string }[] = [
  { valor: 'sistema', rotulo: 'Padrão do sistema', descricao: 'Acompanha o modo claro ou escuro do seu aparelho.' },
  { valor: 'claro', rotulo: 'Claro', descricao: 'Fundo claro sempre.' },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Fundo escuro sempre, mais confortável à noite.' },
]

/** Tema da interface; vale para este navegador (não acompanha a conta em outros aparelhos). */
function CartaoAparencia() {
  const [tema, setTema] = useState(lerTema)
  const escolher = (t: PreferenciaTema) => {
    salvarTema(t)
    setTema(t)
  }
  return (
    <Card>
      <h2>Tema</h2>
      <p className="qz-cta-descricao">A escolha vale para este navegador. A impressão de provas continua sempre clara.</p>
      <fieldset className="qz-cta-temas" aria-label="Tema da interface">
        {OPCOES_TEMA.map((o) => (
          <label key={o.valor} className={`qz-cta-tema${tema === o.valor ? ' qz-cta-tema--ativo' : ''}`}>
            <input type="radio" name="tema" value={o.valor} checked={tema === o.valor} onChange={() => escolher(o.valor)} />
            <span>
              <strong>{o.rotulo}</strong>
              <span className="qz-cta-tema__descricao">{o.descricao}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </Card>
  )
}

/** Direitos do titular: exportação, pedido de correção e de exclusão (LGPD). */
function CartaoPrivacidade() {
  const cliente = useQueryClient()
  const [solicitando, setSolicitando] = useState(false)
  const [corrigindo, setCorrigindo] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const solicitacoes = useQuery({ queryKey: ['minha-conta', 'solicitacoes'], queryFn: () => api<SolicitacaoLgpd[]>('/minha-conta/solicitacoes') })
  const exportar = useMutation({
    mutationFn: async () => {
      const dados = await api<unknown>('/minha-conta/dados')
      salvarArquivo(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }), 'meus-dados-quizzer.json')
    },
  })
  const solicitar = useMutation({
    mutationFn: () => api('/minha-conta/solicitacoes', { method: 'POST', body: { justificativa } }),
    onSuccess: () => {
      setSolicitando(false)
      setJustificativa('')
      void cliente.invalidateQueries({ queryKey: ['minha-conta'] })
    },
  })
  const pendente = solicitacoes.data?.some((s) => s.status === 'PENDENTE')

  return (
    <Card>
      <h2>Privacidade e seus dados (LGPD)</h2>
      <p className="qz-suave">
        Você pode baixar tudo o que o Quizzer guarda sobre você, pedir a correção de dados incorretos ou a exclusão dos seus
        dados pessoais. Saiba mais na <Link to="/privacidade">Política de Privacidade</Link> e nos{' '}
        <Link to="/termos">Termos de Uso</Link>.
      </p>
      {exportar.error && <AlertBanner tipo="erro">{mensagemDeErro(exportar.error)}</AlertBanner>}
      {solicitar.error && <AlertBanner tipo="erro">{mensagemDeErro(solicitar.error)}</AlertBanner>}
      <div className="qz-acoes">
        <Button variante="secundario" carregando={exportar.isPending} onClick={() => exportar.mutate()}>
          <Icone nome="download" /> Baixar meus dados (JSON)
        </Button>
        <Button variante="secundario" disabled={pendente} onClick={() => setCorrigindo(true)}>
          Pedir correção de dados
        </Button>
        <Button variante="fantasma" disabled={pendente} onClick={() => setSolicitando(true)}>
          {pendente ? 'Solicitação em análise' : 'Solicitar exclusão dos meus dados'}
        </Button>
      </div>
      {!!solicitacoes.data?.length && (
        <div className="qz-cta-solicitacoes">
          <DataTable
            rotulo="Minhas solicitações"
            chaveLinha={(s) => s.id}
            linhas={solicitacoes.data}
            colunas={[
              { chave: 't', titulo: 'Pedido', render: (s) => (s.tipo === 'CORRECAO' ? 'Correção' : 'Exclusão') },
              { chave: 'c', titulo: 'Pedido em', render: (s) => formatarDataHora(s.criadoEm) },
              { chave: 's', titulo: 'Situação', render: (s) => <StatusBadge status={s.status} rotulo={ROTULO_LGPD[s.status]} /> },
              { chave: 'r', titulo: 'Resposta', render: (s) => s.resposta ?? '—' },
            ]}
          />
        </div>
      )}

      <Dialog
        aberto={solicitando}
        titulo="Solicitar exclusão dos meus dados"
        aoFechar={() => setSolicitando(false)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setSolicitando(false)}>
              Cancelar
            </Button>
            <Button carregando={solicitar.isPending} onClick={() => solicitar.mutate()}>
              Enviar solicitação
            </Button>
          </>
        }
      >
        <p>A administração tem até 15 dias para responder. Se a exclusão for atendida:</p>
        <ul>
          <li>seu nome, e-mail e matrícula são removidos e a conta é encerrada definitivamente;</li>
          <li>suas notas e provas continuam existindo de forma anônima, por obrigação acadêmica;</li>
          <li>a ação não pode ser desfeita.</li>
        </ul>
        <TextArea rotulo="Motivo (opcional)" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
      </Dialog>
      {corrigindo && <DialogCorrecao aoFechar={() => setCorrigindo(false)} />}
    </Card>
  )
}

/** LGPD (lote 8): pedido de correção de nome e/ou matrícula; a administração confere e aplica. */
function DialogCorrecao({ aoFechar }: { aoFechar: () => void }) {
  const cliente = useQueryClient()
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const pedir = useMutation({
    mutationFn: () =>
      api('/minha-conta/solicitacoes', {
        method: 'POST',
        body: { tipo: 'CORRECAO', justificativa, correcao: { ...(nome.trim() ? { nome } : {}), ...(matricula.trim() ? { matricula } : {}) } },
      }),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ['minha-conta'] })
      aoFechar()
    },
  })
  return (
    <Dialog
      aberto
      titulo="Pedir correção de dados"
      aoFechar={aoFechar}
      acoes={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button disabled={!nome.trim() && !matricula.trim()} carregando={pedir.isPending} onClick={() => pedir.mutate()}>
            Enviar pedido
          </Button>
        </>
      }
    >
      {pedir.error && <AlertBanner tipo="erro">{mensagemDeErro(pedir.error)}</AlertBanner>}
      <p className="qz-suave">Preencha só o que está errado. A administração confere e responde em até 15 dias.</p>
      <TextField rotulo="Nome correto" value={nome} onChange={(e) => setNome(e.target.value)} />
      <TextField rotulo="Matrícula correta" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
      <TextArea rotulo="Observação (opcional)" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
    </Dialog>
  )
}
