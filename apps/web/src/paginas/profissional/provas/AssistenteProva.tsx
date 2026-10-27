import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import { ROTULO_NATUREZA, type ParametrosProva, type ProvaDetalhe } from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { AlertBanner, Button, Card, Icone, StatusBadge, Stepper } from '../../../design-system'
import { resumir } from '../../../util/formato'
import { FormParametros } from './FormParametros'
import { PARAMETROS_PADRAO, somenteParametros } from './padroes'
import { ComposicaoSecoes } from './ComposicaoSecoes'
import { ResumoParametros } from './ResumoParametros'

const PASSOS = ['Configuração', 'Montagem', 'Revisão e publicação']

export function NovaProva() {
  const navegar = useNavigate()
  const cliente = useQueryClient()
  const criar = useMutation({
    mutationFn: (p: ParametrosProva) => api<{ id: string }>('/provas', { method: 'POST', body: p }),
    onSuccess: (r) => {
      void cliente.invalidateQueries({ queryKey: ['provas'] })
      navegar(`/app/provas/${r.id}/editar?passo=1`)
    },
  })
  return (
    <>
      <CabecalhoPagina
        titulo="Nova prova"
        descricao="Defina as informações e as regras; em seguida, escolha as questões."
        voltar={{ para: '/app/provas', rotulo: 'Voltar para provas' }}
      />
      <Stepper passos={PASSOS} atual={0} />
      {criar.error && <AlertBanner tipo="erro">{mensagemDeErro(criar.error)}</AlertBanner>}
      <FormParametros inicial={PARAMETROS_PADRAO} salvando={criar.isPending} rotuloSalvar="Salvar e escolher questões" aoSalvar={(p) => criar.mutate(p)} />
    </>
  )
}

/** Assistente de prova em rascunho (RF05): parâmetros → composição manual → publicação. */
export function EditarProva() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const passo = Math.min(2, Math.max(0, Number(params.get('passo') ?? 0)))
  const irPara = (p: number) => setParams({ passo: String(p) })
  const [montagemPendente, setMontagemPendente] = useState(false)
  /** Pelo Stepper: não descarta a montagem não salva sem perguntar. */
  const irParaPeloStepper = (p: number) => {
    if (passo === 1 && p !== 1 && montagemPendente && !window.confirm('A montagem tem alterações não salvas. Sair do passo e descartá-las?')) return
    setMontagemPendente(false)
    irPara(p)
  }
  const consulta = useQuery({ queryKey: ['prova', id], queryFn: () => api<ProvaDetalhe>(`/provas/${id}`) })
  const cliente = useQueryClient()
  const navegar = useNavigate()
  const recarregar = () => cliente.invalidateQueries({ queryKey: ['prova', id] })

  const salvarParametros = useMutation({
    mutationFn: (p: ParametrosProva) => api(`/provas/${id}`, { method: 'PUT', body: p }),
    onSuccess: async () => {
      await recarregar()
      irPara(1)
    },
  })
  const atualizarVersoes = useMutation({
    mutationFn: () => api(`/provas/${id}/atualizar-versoes`, { method: 'POST' }),
    onSuccess: () => recarregar(),
  })
  const publicar = useMutation({
    mutationFn: () => api(`/provas/${id}/publicar`, { method: 'POST' }),
    onSuccess: async () => {
      await recarregar()
      void cliente.invalidateQueries({ queryKey: ['provas'] })
      navegar(`/app/provas/${id}`)
    },
  })

  return (
    <EstadoConsulta consulta={consulta}>
      {(prova) => {
        const equilibrada = Math.abs(prova.somaPesos - 100) <= 0.01
        return prova.status !== 'RASCUNHO' ? (
          <Navigate to={`/app/provas/${prova.id}`} replace />
        ) : (
          <>
            <CabecalhoPagina
              titulo={prova.titulo}
              sobretitulo={<StatusBadge status="RASCUNHO" rotulo="Rascunho" />}
              descricao="Versão em edição. Só fica disponível para aplicação depois de publicada."
              voltar={{ para: '/app/provas', rotulo: 'Voltar para provas' }}
            />
            <Stepper passos={PASSOS} atual={passo} aoSelecionar={irParaPeloStepper} />
            {passo === 0 && (
              <>
                {salvarParametros.error && <AlertBanner tipo="erro">{mensagemDeErro(salvarParametros.error)}</AlertBanner>}
                <FormParametros inicial={somenteParametros(prova)} salvando={salvarParametros.isPending} rotuloSalvar="Salvar e continuar" aoSalvar={(p) => salvarParametros.mutate(p)} />
              </>
            )}
            {passo === 1 && <ComposicaoSecoes
                prova={prova}
                aoSalvar={() => irPara(2)}
                aoEditarInformacoes={() => irParaPeloStepper(0)}
                aoMudarPendencia={setMontagemPendente}
              />}
            {passo === 2 && (
              <div className="qz-duas-colunas">
                <div className="qz-pilha">
                  <Card>
                    <h2>Questões da prova</h2>
                    {atualizarVersoes.error && <AlertBanner tipo="erro">{mensagemDeErro(atualizarVersoes.error)}</AlertBanner>}
                    {prova.itens.some((i) => i.versaoMaisNova) && (
                      <AlertBanner tipo="alerta" titulo="Há versões mais novas de questões desta prova">
                        <p>Questões editadas e aprovadas depois de entrarem nesta prova. Pesos e ordem são mantidos.</p>
                        <Button variante="secundario" carregando={atualizarVersoes.isPending} onClick={() => atualizarVersoes.mutate()}>
                          Usar as versões mais novas
                        </Button>
                      </AlertBanner>
                    )}
                    {prova.secoes.length > 0 && (
                      <ul className="qz-prv-secoes-resumo">
                        {prova.secoes.map((sec) => (
                          <li key={sec.id}>
                            <strong>{sec.titulo}</strong> —{' '}
                            {sec.modo === 'SORTEIO'
                              ? `sorteio de ${sec.sortear} entre ${prova.itens.filter((i) => i.secaoId === sec.id).length} questões, peso ${sec.peso}%`
                              : `${prova.itens.filter((i) => i.secaoId === sec.id).length} questões`}
                            {sec.notaMinima != null && ` · nota mínima ${sec.notaMinima}`}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="qz-suave qz-pequeno">Cada participante recebe {prova.questoesPorParticipante} questões.</p>
                    <ol className="qz-prv-itens">
                      {prova.itens.map((i, k) => (
                        <li key={i.versaoQuestaoId} className="qz-prv-item">
                          <span className="qz-prv-item__ordem">{k + 1}</span>
                          <span className="qz-prv-item__texto">
                            <span className="qz-pre">{resumir(i.enunciado, 220)}</span>
                            <small>
                              {i.natureza && ROTULO_NATUREZA[i.natureza]}
                              {i.versaoMaisNova && (
                                <>
                                  {' '}
                                  <StatusBadge status="NOVA" tom="alerta" rotulo={`versão ${i.versaoMaisNova} disponível`} />
                                </>
                              )}
                            </small>
                          </span>
                          <span className="qz-prv-item__peso">
                            <small>Peso</small>
                            <span>{i.peso}%</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </Card>
                  <Card>
                    <h2>Parâmetros</h2>
                    <ResumoParametros prova={prova} />
                  </Card>
                </div>
                <aside className="qz-pilha">
                  <Card>
                    <h2>Resumo da avaliação</h2>
                    <dl className="qz-prv-resumo__linhas">
                      <div>
                        <dt>Questões</dt>
                        <dd>{prova.itens.length}</dd>
                      </div>
                      <div>
                        <dt>Seções</dt>
                        <dd>{Math.max(1, prova.secoes.length)}</dd>
                      </div>
                      <div className="qz-prv-resumo__total">
                        <dt>Soma dos pesos</dt>
                        <dd className={equilibrada ? undefined : 'qz-prv-resumo__alerta'}>{prova.somaPesos}%</dd>
                      </div>
                    </dl>
                  </Card>
                  {equilibrada ? (
                    <AlertBanner tipo="info" titulo="Pronta para publicar">
                      Depois de publicada, a prova não pode mais ser alterada e fica disponível para aplicação.
                    </AlertBanner>
                  ) : (
                    <AlertBanner tipo="alerta">A soma dos pesos precisa ser 100% para publicar. Volte ao passo anterior.</AlertBanner>
                  )}
                  {publicar.error && <AlertBanner tipo="erro">{mensagemDeErro(publicar.error)}</AlertBanner>}
                  <Button largo carregando={publicar.isPending} disabled={prova.itens.length === 0} onClick={() => publicar.mutate()}>
                    <Icone nome="enviar" /> Publicar prova
                  </Button>
                  <Button variante="secundario" largo onClick={() => irPara(1)}>
                    <Icone nome="seta-esquerda" /> Voltar à montagem
                  </Button>
                </aside>
              </div>
            )}
          </>
        )
      }}
    </EstadoConsulta>
  )
}
