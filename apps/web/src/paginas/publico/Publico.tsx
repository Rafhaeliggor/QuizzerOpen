import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { api, mensagemDeErro } from '../../api/cliente'
import type { Comprovante, ExecucaoPayload, SituacaoJanela, ValorResposta } from '../../api/tipos'
import { EstadoConsulta } from '../../componentes/EstadoConsulta'
import { ExecucaoProva } from '../../componentes/execucao/ExecucaoProva'
import { VisaoComprovante } from '../../componentes/execucao/VisaoComprovante'
import { AlertBanner, Button, Icone, TextField } from '../../design-system'
import { LayoutAuth } from '../../layouts/LayoutAuth'
import { Marca } from '../../layouts/Marca'
import '../aluno/aluno.css'
import { formatarDataHora } from '../../util/formato'

/**
 * Prova pública (RF06 passo 1): acesso por PIN/link com identificação mínima.
 * O token do participante fica no sessionStorage da aba — permite recarregar a
 * página sem perder a prova, mas não vaza para outras abas/navegadores.
 */
const chaveToken = (tentativaId: string) => `qz_participante_${tentativaId}`

function tokenDe(tentativaId: string): string | null {
  try {
    return sessionStorage.getItem(chaveToken(tentativaId))
  } catch {
    return null
  }
}

export function EntradaPin() {
  const navegar = useNavigate()
  const [pin, setPin] = useState('')
  function enviar(e: FormEvent) {
    e.preventDefault()
    navegar(`/p/${pin.trim().toUpperCase()}`)
  }
  return (
    <LayoutAuth titulo="Tenho um código de acesso" subtitulo="Digite o código da prova informado pelo professor" rodape={<Link to="/aluno/login">Sou aluno com login</Link>}>
      <form onSubmit={enviar}>
        <TextField rotulo="Código de acesso" required autoFocus maxLength={12} value={pin} onChange={(e) => setPin(e.target.value.toUpperCase())} />
        <Button type="submit" largo disabled={pin.trim().length < 4}>
          Continuar
        </Button>
      </form>
    </LayoutAuth>
  )
}

interface InfoPublica {
  titulo: string
  descricao: string | null
  tempoLimiteMin: number | null
  totalQuestoes: number
  janelaInicio: string
  janelaFim: string
  situacao: SituacaoJanela
}

export function InicioPublico() {
  const { pin } = useParams()
  const navegar = useNavigate()
  const consulta = useQuery({ queryKey: ['publico', pin], queryFn: () => api<InfoPublica>(`/publico/aplicacoes/${pin}`, { semRenovacao: true }), retry: false })
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const iniciar = useMutation({
    mutationFn: () => api<{ tentativaId: string; token: string }>(`/publico/aplicacoes/${pin}/iniciar`, { method: 'POST', body: { nome, email }, semRenovacao: true }),
    onSuccess: (r) => {
      try {
        sessionStorage.setItem(chaveToken(r.tentativaId), r.token)
      } catch {
        /* sem sessionStorage: a prova funciona, mas recarregar a página perde o acesso */
      }
      navegar(`/p/${pin}/prova/${r.tentativaId}`, { state: { token: r.token } })
    },
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    iniciar.mutate()
  }
  return (
    <LayoutAuth titulo="Prova pública" rodape={<Link to="/p">Usar outro código</Link>}>
      <EstadoConsulta consulta={consulta}>
        {(info) => (
          <form onSubmit={enviar}>
            <h2 style={{ marginTop: 0 }}>{info.titulo}</h2>
            {info.descricao && <p className="qz-pre qz-suave">{info.descricao}</p>}
            <div className="qz-al-numeros">
              <div>
                <Icone nome="documentos" />
                <span>Questões</span>
                <strong>{info.totalQuestoes}</strong>
              </div>
              <div>
                <Icone nome="relogio" />
                <span>Duração</span>
                <strong>{info.tempoLimiteMin ? `${info.tempoLimiteMin} minutos` : 'Sem limite'}</strong>
              </div>
            </div>
            <p className="qz-pequeno qz-suave">Disponível até {formatarDataHora(info.janelaFim)}.</p>
            {info.situacao !== 'DISPONIVEL' ? (
              <AlertBanner tipo="alerta">
                {info.situacao === 'AGENDADA' ? `Esta prova abre em ${formatarDataHora(info.janelaInicio)}.` : 'O período desta prova terminou.'}
              </AlertBanner>
            ) : (
              <>
                <AlertBanner tipo="info">Identificação mínima: seu resultado não é certificado.</AlertBanner>
                {iniciar.error && <AlertBanner tipo="erro">{mensagemDeErro(iniciar.error)}</AlertBanner>}
                <TextField rotulo="Seu nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
                <TextField rotulo="Seu e-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                <p className="qz-suave qz-pequeno">
                  Ao iniciar, você aceita os{' '}
                  <Link to="/termos" target="_blank" rel="noopener">
                    Termos de Uso
                  </Link>{' '}
                  e declara ciência da{' '}
                  <Link to="/privacidade" target="_blank" rel="noopener">
                    Política de Privacidade
                  </Link>
                  .
                </p>
                <Button type="submit" largo carregando={iniciar.isPending} disabled={!nome || !email}>
                  Iniciar prova
                </Button>
              </>
            )}
          </form>
        )}
      </EstadoConsulta>
    </LayoutAuth>
  )
}

export function ExecucaoPublica() {
  const { pin, id } = useParams()
  const navegar = useNavigate()
  const estado = useLocation().state as { token?: string } | null
  const token = estado?.token ?? tokenDe(id!)
  const carregar = useCallback(() => api<ExecucaoPayload>(`/publico/tentativas/${id}`, { token: token! }), [id, token])
  const abrirSessao = useCallback(
    async () => (await api<{ sessaoExecucao: string }>(`/publico/tentativas/${id}/sessao`, { method: 'POST', token: token! })).sessaoExecucao,
    [id, token],
  )
  const salvar = useCallback(
    (vq: string, valor: ValorResposta, sessao: string) =>
      api(`/publico/tentativas/${id}/respostas/${vq}`, {
        method: 'PUT',
        body: valor,
        token: token!,
        cabecalhos: { 'X-Sessao-Execucao': sessao },
      }),
    [id, token],
  )
  const enviar = useCallback(
    (sessao: string) =>
      api<Comprovante>(`/publico/tentativas/${id}/enviar`, { method: 'POST', token: token!, cabecalhos: { 'X-Sessao-Execucao': sessao } }),
    [id, token],
  )
  const aoConcluir = useCallback(
    (c: Comprovante) => navegar(`/p/${pin}/comprovante/${id}`, { replace: true, state: { comprovante: c, token } }),
    [id, pin, token, navegar],
  )
  const registrarEvento = useCallback(
    (tipo: 'SAIU_DA_PROVA' | 'VOLTOU_A_PROVA') =>
      api(`/publico/tentativas/${id}/eventos`, {
        method: 'POST',
        body: { tipo, ocorridoEm: new Date().toISOString() },
        token: token!,
      }),
    [id, token],
  )
  if (!token) {
    return (
      <LayoutAuth titulo="Acesso não encontrado" rodape={<Link to={`/p/${pin}`}>Voltar</Link>}>
        Abra a prova no mesmo navegador e aba em que você a iniciou.
      </LayoutAuth>
    )
  }
  return (
    <>
      <header className="qz-barra-aluno">
        <Marca para={`/p/${pin}`} />
        <div className="qz-barra-aluno__direita">
          <span className="qz-badge qz-badge--info">Prova pública</span>
        </div>
      </header>
      <ExecucaoProva
        carregar={carregar}
        abrirSessao={abrirSessao}
        salvar={salvar}
        enviar={enviar}
        aoConcluir={aoConcluir}
        registrarEvento={registrarEvento}
      />
    </>
  )
}

export function ComprovantePublico() {
  const { id, pin } = useParams()
  const estado = useLocation().state as { comprovante?: Comprovante; token?: string } | null
  const token = estado?.token ?? tokenDe(id!)
  const consulta = useQuery({
    queryKey: ['comprovante-publico', id],
    queryFn: () => api<Comprovante>(`/publico/tentativas/${id}/comprovante`, { token: token ?? '' }),
    initialData: estado?.comprovante,
    enabled: !!token || !!estado?.comprovante,
  })
  if (!token && !estado?.comprovante) {
    return (
      <LayoutAuth titulo="Comprovante indisponível" rodape={<Link to={`/p/${pin}`}>Voltar</Link>}>
        O comprovante só pode ser aberto no mesmo navegador em que a prova foi enviada.
      </LayoutAuth>
    )
  }
  return (
    <>
      <header className="qz-barra-aluno qz-nao-imprimir">
        <Marca para={`/p/${pin}`} />
        <div className="qz-barra-aluno__direita">
          <span className="qz-badge qz-badge--info">Prova pública</span>
        </div>
      </header>
      <EstadoConsulta consulta={consulta}>
        {(c) => (
          <VisaoComprovante
            c={c}
            acoes={
              <Button variante="secundario" onClick={() => window.print()}>
                Imprimir comprovante
              </Button>
            }
          />
        )}
      </EstadoConsulta>
    </>
  )
}
