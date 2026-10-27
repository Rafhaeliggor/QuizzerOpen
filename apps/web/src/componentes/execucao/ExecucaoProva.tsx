import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ErroApi, mensagemDeErro } from '../../api/cliente'
import { ROTULO_FORMATO, formatoDaQuestao, type Comprovante, type ExecucaoPayload, type QuestaoExecucao, type ValorResposta } from '../../api/tipos'
import { AlertBanner, Button, Dialog, Icone, Spinner, Timer } from '../../design-system'
import { ListaMidias } from '../Midias'
import { TextoRico } from '../TextoRico'
import { EntradaAssociacao, EntradaOrdenacao } from '../QuestaoEstruturada'
import '../../paginas/aluno/aluno.css'

interface Props {
  carregar: () => Promise<ExecucaoPayload>
  /** Abre (ou assume) a sessão única desta tentativa e devolve o identificador. */
  abrirSessao: () => Promise<string>
  salvar: (versaoQuestaoId: string, valor: ValorResposta, sessao: string) => Promise<unknown>
  enviar: (sessao: string) => Promise<Comprovante>
  aoConcluir: (comprovante: Comprovante) => void
  /** Registra saída/volta da aba da prova (RF06 — eventos de comportamento). */
  registrarEvento?: (tipo: 'SAIU_DA_PROVA' | 'VOLTOU_A_PROVA') => Promise<unknown>
}

type EstadoSalvamento = 'salvando' | 'salvo' | 'erro'

const ATRASO_TEXTO_MS = 1200
const NOVA_TENTATIVA_MS = 3000

const chaveRevisar = (tentativaId: string) => `qz-revisar-${tentativaId}`

/** Marcações salvas no navegador para a tentativa; sem armazenamento disponível, nenhuma. */
function lerMarcadas(tentativaId: string | undefined): Set<string> {
  if (!tentativaId) return new Set()
  try {
    const salvas = localStorage.getItem(chaveRevisar(tentativaId))
    return new Set(salvas ? (JSON.parse(salvas) as string[]) : [])
  } catch {
    return new Set()
  }
}

function respondida(v: ValorResposta | undefined): boolean {
  return !!v && (!!v.alternativaId || !!v.alternativaIds?.length || !!v.texto?.trim() || !!v.ordem?.length || Object.keys(v.pares ?? {}).length > 0)
}

/**
 * Tela de execução (RF06). O servidor é a fonte da verdade do tempo e das respostas:
 * - o cronômetro só exibe o prazo do servidor (corrigido pela diferença de relógio);
 * - cada resposta é salva automaticamente (autosave); se a rede cair, as respostas
 *   ficam pendentes e são reenviadas sozinhas;
 * - ao esgotar o tempo, a prova é enviada; se o servidor já tiver encerrado, mostra o comprovante.
 */
export function ExecucaoProva({ carregar, abrirSessao, salvar, enviar, aoConcluir, registrarEvento }: Props) {
  const [dados, setDados] = useState<ExecucaoPayload | null>(null)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [respostas, setRespostas] = useState<Record<string, ValorResposta>>({})
  const [estado, setEstado] = useState<Record<string, EstadoSalvamento>>({})
  const [indice, setIndice] = useState(0)
  const [deslocamento, setDeslocamento] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  /** A prova foi aberta em outro dispositivo/aba (sessão única). */
  const [substituida, setSubstituida] = useState(false)
  const [recarga, setRecarga] = useState(0)
  /** "Marcar para revisar" (Figma — feature 037): lembrete do aluno, guardado no navegador por tentativa. */
  const [marcacao, setMarcacao] = useState<{ tentativaId: string; ids: Set<string> } | null>(null)
  const sessao = useRef('')

  const pendentes = useRef(new Map<string, ValorResposta>())
  const temporizadores = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const finalizando = useRef(false)
  // Refs para os novos agendamentos (os callbacks se reagendam após falha de rede).
  const concluirRef = useRef<() => Promise<void>>(async () => {})
  const descarregarRef = useRef<(vq: string) => Promise<void>>(async () => {})

  const idTentativa = dados?.tentativa.id
  const marcadas = marcacao && marcacao.tentativaId === idTentativa ? marcacao.ids : lerMarcadas(idTentativa)
  const alternarRevisar = (versaoQuestaoId: string) => {
    if (!idTentativa) return
    const nova = new Set(marcadas)
    if (nova.has(versaoQuestaoId)) nova.delete(versaoQuestaoId)
    else nova.add(versaoQuestaoId)
    try {
      localStorage.setItem(chaveRevisar(idTentativa), JSON.stringify([...nova]))
    } catch {
      // navegador sem armazenamento (aba privada): a marcação vale só enquanto a página estiver aberta
    }
    setMarcacao({ tentativaId: idTentativa, ids: nova })
  }

  // ---------------------------------------------------------------- envio

  const concluir = useCallback(async () => {
    if (finalizando.current) return
    finalizando.current = true
    setEnviando(true)
    try {
      aoConcluir(await enviar(sessao.current))
    } catch (e) {
      finalizando.current = false
      setEnviando(false)
      if (e instanceof ErroApi && e.codigo === 'SESSAO_SUBSTITUIDA') {
        setSubstituida(true)
        return
      }
      setAviso(`Não foi possível enviar: ${mensagemDeErro(e)} Tentaremos de novo — não feche a página.`)
      setTimeout(() => void concluirRef.current(), NOVA_TENTATIVA_MS)
    }
  }, [enviar, aoConcluir])
  useEffect(() => {
    concluirRef.current = concluir
  }, [concluir])

  // ---------------------------------------------------------------- autosave

  const descarregar = useCallback(
    async (vq: string): Promise<void> => {
      const valor = pendentes.current.get(vq)
      if (valor === undefined || finalizando.current) return
      setEstado((e) => ({ ...e, [vq]: 'salvando' }))
      try {
        await salvar(vq, valor, sessao.current)
        if (pendentes.current.get(vq) === valor) {
          pendentes.current.delete(vq)
          setEstado((e) => ({ ...e, [vq]: 'salvo' }))
        }
        setAviso(null)
      } catch (e) {
        if (e instanceof ErroApi && e.codigo === 'SESSAO_SUBSTITUIDA') {
          // Outro dispositivo assumiu: para tudo sem reenviar (as respostas de lá prevalecem).
          for (const t of temporizadores.current.values()) clearTimeout(t)
          temporizadores.current.clear()
          pendentes.current.clear()
          setSubstituida(true)
          return
        }
        if (e instanceof ErroApi && e.codigo === 'TENTATIVA_ENCERRADA') {
          pendentes.current.clear()
          await concluir()
          return
        }
        if (e instanceof ErroApi && e.status >= 400 && e.status < 500) {
          pendentes.current.delete(vq)
          setEstado((x) => ({ ...x, [vq]: 'erro' }))
          setAviso(e.message)
          return
        }
        // Falha de rede/servidor: mantém pendente e tenta de novo.
        setEstado((x) => ({ ...x, [vq]: 'erro' }))
        setAviso('Sem conexão com o servidor. Suas respostas serão reenviadas automaticamente.')
        temporizadores.current.set(
          vq,
          setTimeout(() => void descarregarRef.current(vq), NOVA_TENTATIVA_MS),
        )
      }
    },
    [salvar, concluir],
  )
  useEffect(() => {
    descarregarRef.current = descarregar
  }, [descarregar])

  const descarregarTudo = useCallback(async () => {
    for (const t of temporizadores.current.values()) clearTimeout(t)
    temporizadores.current.clear()
    await Promise.all([...pendentes.current.keys()].map((vq) => descarregar(vq)))
  }, [descarregar])

  function responder(q: QuestaoExecucao, valor: ValorResposta) {
    setRespostas((r) => ({ ...r, [q.versaoQuestaoId]: valor }))
    pendentes.current.set(q.versaoQuestaoId, valor)
    clearTimeout(temporizadores.current.get(q.versaoQuestaoId))
    if (q.alternativas) {
      void descarregar(q.versaoQuestaoId)
    } else {
      temporizadores.current.set(
        q.versaoQuestaoId,
        setTimeout(() => void descarregar(q.versaoQuestaoId), ATRASO_TEXTO_MS),
      )
    }
  }

  // ---------------------------------------------------------------- carga

  useEffect(() => {
    let ativo = true
    carregar()
      .then(async (d) => {
        if (!ativo) return
        if (d.tentativa.status !== 'EM_ANDAMENTO' && d.tentativa.status !== 'REABERTA') {
          void concluir()
          return
        }
        sessao.current = await abrirSessao()
        if (!ativo) return
        setSubstituida(false)
        setDeslocamento(new Date(d.agora).getTime() - Date.now())
        setRespostas(d.respostas)
        if (d.prova.modoNavegacao === 'SEQUENCIAL') {
          // Retoma na primeira questão ainda não respondida.
          const ultima = d.questoes.reduce((m, q, i) => (respondida(d.respostas[q.versaoQuestaoId]) ? i : m), -1)
          setIndice(Math.min(d.questoes.length - 1, ultima + 1))
        }
        setDados(d)
      })
      .catch((e: unknown) => ativo && setErroCarga(mensagemDeErro(e)))
    return () => {
      ativo = false
    }
  }, [carregar, abrirSessao, concluir, recarga])

  // Avisa antes de fechar a aba com respostas ainda não salvas.
  useEffect(() => {
    const antes = (e: BeforeUnloadEvent) => {
      if (pendentes.current.size > 0 && !finalizando.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', antes)
    const temporizadoresAtuais = temporizadores.current
    return () => {
      window.removeEventListener('beforeunload', antes)
      for (const t of temporizadoresAtuais.values()) clearTimeout(t)
    }
  }, [])

  // Saída e volta da aba/janela da prova: só registra para o professor; não bloqueia nada.
  const emProva = !!dados && !substituida
  useEffect(() => {
    if (!emProva || !registrarEvento) return
    const aoMudar = () => {
      if (finalizando.current) return
      registrarEvento(document.visibilityState === 'hidden' ? 'SAIU_DA_PROVA' : 'VOLTOU_A_PROVA').catch(() => {})
    }
    document.addEventListener('visibilitychange', aoMudar)
    return () => document.removeEventListener('visibilitychange', aoMudar)
  }, [emProva, registrarEvento])

  const tempoEsgotado = useCallback(() => {
    if (substituida) return
    void descarregarTudo().finally(() => void concluir())
  }, [descarregarTudo, concluir, substituida])

  if (erroCarga) return <AlertBanner tipo="erro">{erroCarga}</AlertBanner>
  if (substituida) {
    return (
      <div className="qz-comprovante">
        <AlertBanner tipo="alerta" titulo="Prova aberta em outro lugar">
          Esta prova foi aberta em outro dispositivo ou aba e só pode ser respondida em um lugar por vez. As respostas
          salvas lá continuam valendo. A troca fica registrada para o professor.
        </AlertBanner>
        <Button
          onClick={() => {
            setDados(null)
            setRecarga((n) => n + 1)
          }}
        >
          Continuar neste dispositivo
        </Button>
      </div>
    )
  }
  if (!dados || enviando) return <Spinner telaCheia rotulo={enviando ? 'Enviando sua prova…' : 'Carregando prova…'} />

  const sequencial = dados.prova.modoNavegacao === 'SEQUENCIAL'
  const questao = dados.questoes[indice]!
  const total = dados.questoes.length
  const respondidas = dados.questoes.filter((q) => respondida(respostas[q.versaoQuestaoId])).length
  const emBranco = total - respondidas
  const status = estado[questao.versaoQuestaoId]
  const formato = formatoDaQuestao(questao)
  const valorAtual = respostas[questao.versaoQuestaoId]
  const paraRevisar = sequencial ? [] : dados.questoes.map((q, i) => ({ q, i })).filter(({ q }) => marcadas.has(q.versaoQuestaoId))
  const marcadaAtual = !sequencial && marcadas.has(questao.versaoQuestaoId)

  const irPara = async (i: number) => {
    await descarregar(questao.versaoQuestaoId)
    setIndice(i)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="qz-al-execucao">
      <div className="qz-al-execucao__topo">
        <div>
          <h1 className="qz-al-execucao__titulo">{dados.prova.titulo}</h1>
          <span className="qz-suave qz-pequeno">
            Tentativa {dados.tentativa.numero} · {respondidas} de {total} respondidas{sequencial && ' · navegação sequencial (sem voltar)'}
          </span>
        </div>
        <Timer prazo={dados.tentativa.prazoEm} deslocamentoMs={deslocamento} aoEsgotar={tempoEsgotado} />
      </div>

      {aviso && <AlertBanner tipo="alerta">{aviso}</AlertBanner>}

      <div className="qz-al-execucao__corpo">
        <div className="qz-al-execucao__principal">
          <section aria-labelledby="titulo-questao" className="qz-cartao">
            <div className="qz-al-questao__topo">
              <h2 id="titulo-questao" className="qz-badge qz-badge--info">
                Questão {indice + 1} de {total}
              </h2>
              <span className="qz-suave qz-pequeno">
                {questao.secaoTitulo && `${questao.secaoTitulo} · `}
                {ROTULO_FORMATO[formato]}
              </span>
              {!sequencial && (
                <Button variante="fantasma" aria-pressed={marcadaAtual} onClick={() => alternarRevisar(questao.versaoQuestaoId)}>
                  {marcadaAtual ? '★ Marcada para revisar' : '☆ Marcar para revisar'}
                </Button>
              )}
            </div>
            <p className="qz-pre qz-al-enunciado">
              <TextoRico texto={questao.enunciado} />
            </p>
            <ListaMidias midias={questao.midias} />

            {formato === 'MULTIPLA_RESPOSTA' ? (
              <fieldset className="qz-al-opcoes">
                <legend>Marque todas as corretas (marcar errada desconta).</legend>
                {questao.alternativas?.map((a, i) => {
                  const marcadas = valorAtual?.alternativaIds ?? []
                  return (
                    <Opcao key={a.id} letra={String.fromCharCode(65 + i)} texto={a.texto} marcada={marcadas.includes(a.id)}>
                      <input
                        type="checkbox"
                        checked={marcadas.includes(a.id)}
                        onChange={() =>
                          responder(questao, {
                            alternativaIds: marcadas.includes(a.id) ? marcadas.filter((x) => x !== a.id) : [...marcadas, a.id],
                          })
                        }
                      />
                    </Opcao>
                  )
                })}
              </fieldset>
            ) : formato === 'RESPOSTA_NUMERICA' ? (
              <div className="qz-campo">
                <label htmlFor="resposta-numerica">Sua resposta (número)</label>
                <input
                  id="resposta-numerica"
                  inputMode="decimal"
                  maxLength={50}
                  autoComplete="off"
                  value={valorAtual?.texto ?? ''}
                  onChange={(e) => responder(questao, { texto: e.target.value })}
                  onBlur={() => void descarregar(questao.versaoQuestaoId)}
                />
                <span className="qz-pequeno qz-suave">Use vírgula ou ponto para decimais, ex.: 3,14</span>
              </div>
            ) : formato === 'RESPOSTA_CURTA' ? (
              <div className="qz-campo">
                <label htmlFor="resposta-curta">Sua resposta (curta)</label>
                <input
                  id="resposta-curta"
                  maxLength={500}
                  autoComplete="off"
                  value={valorAtual?.texto ?? ''}
                  onChange={(e) => responder(questao, { texto: e.target.value })}
                  onBlur={() => void descarregar(questao.versaoQuestaoId)}
                />
              </div>
            ) : formato === 'ASSOCIACAO' && questao.alternativas ? (
              <EntradaAssociacao alternativas={questao.alternativas} valor={valorAtual} aoMudar={(v) => responder(questao, v)} />
            ) : formato === 'ORDENACAO' && questao.alternativas ? (
              <EntradaOrdenacao alternativas={questao.alternativas} valor={valorAtual} aoMudar={(v) => responder(questao, v)} />
            ) : questao.alternativas ? (
              <fieldset className="qz-al-opcoes">
                <legend>{formato === 'VERDADEIRO_FALSO' ? 'Selecione uma opção.' : 'Selecione uma alternativa.'}</legend>
                {questao.alternativas.map((a, i) => (
                  <Opcao
                    key={a.id}
                    letra={formato !== 'VERDADEIRO_FALSO' ? String.fromCharCode(65 + i) : undefined}
                    texto={a.texto}
                    marcada={valorAtual?.alternativaId === a.id}
                  >
                    <input
                      type="radio"
                      name={`q-${questao.versaoQuestaoId}`}
                      checked={valorAtual?.alternativaId === a.id}
                      onChange={() => responder(questao, { alternativaId: a.id })}
                    />
                  </Opcao>
                ))}
              </fieldset>
            ) : (
              <div className="qz-campo">
                <label htmlFor="resposta-aberta">Sua resposta</label>
                <textarea
                  id="resposta-aberta"
                  rows={10}
                  maxLength={20000}
                  value={valorAtual?.texto ?? ''}
                  onChange={(e) => responder(questao, { texto: e.target.value })}
                  onBlur={() => void descarregar(questao.versaoQuestaoId)}
                />
              </div>
            )}

            <div className="qz-al-questao__rodape">
              <span className={`qz-salvamento${status === 'erro' ? ' qz-salvamento--erro' : ''}`} aria-live="polite">
                {status === 'salvando' ? 'Salvando…' : status === 'salvo' ? 'Resposta salva ✓' : status === 'erro' ? 'Não salva — tentando de novo' : ''}
              </span>
              {questao.alternativas && formato !== 'MULTIPLA_RESPOSTA' && formato !== 'ASSOCIACAO' && formato !== 'ORDENACAO' && respondida(valorAtual) && (
                <Button variante="secundario" onClick={() => responder(questao, { alternativaId: null })}>
                  Limpar resposta
                </Button>
              )}
            </div>
          </section>

          <div className="qz-al-navegacao">
            {!sequencial ? (
              <Button variante="secundario" disabled={indice === 0} onClick={() => void irPara(indice - 1)}>
                ← Anterior
              </Button>
            ) : (
              <span />
            )}
            {indice < total - 1 ? (
              <Button onClick={() => void irPara(indice + 1)}>Próxima →</Button>
            ) : (
              <Button onClick={() => setConfirmando(true)}>Revisar e enviar</Button>
            )}
          </div>
          <p className="qz-suave qz-pequeno">
            O tempo é controlado pelo servidor e não pausa se você sair. Ao terminar o tempo, as respostas salvas são enviadas
            automaticamente.{registrarEvento && ' Saídas desta aba durante a prova ficam registradas para o professor.'}
          </p>
        </div>

        <aside aria-label="Mapa de questões" className="qz-cartao qz-al-progresso">
          <h2>Seu progresso</h2>
          <p className="qz-al-progresso__contagem">
            {respondidas} de {total} questões respondidas
          </p>
          <div className="qz-al-barra" aria-hidden>
            <div className="qz-al-barra__preenchida" style={{ width: `${total ? (respondidas / total) * 100 : 0}%` }} />
          </div>
          <div className="qz-mapa">
            {dados.questoes.map((q, i) => (
              <button
                key={q.versaoQuestaoId}
                type="button"
                disabled={sequencial && i !== indice}
                className={`${respondida(respostas[q.versaoQuestaoId]) ? 'qz-mapa__respondida' : ''} ${i === indice ? 'qz-mapa__atual' : ''} ${marcadas.has(q.versaoQuestaoId) && !sequencial ? 'qz-mapa__revisar' : ''}`}
                aria-label={`Questão ${i + 1}${respondida(respostas[q.versaoQuestaoId]) ? ', respondida' : ''}${marcadas.has(q.versaoQuestaoId) && !sequencial ? ', marcada para revisar' : ''}`}
                aria-current={i === indice}
                onClick={() => void irPara(i)}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="qz-al-legenda">
            <span>
              <span className="qz-badge qz-badge--info">Respondida</span>
              {respondidas === 1 ? '1 questão' : `${respondidas} questões`}
            </span>
            <span>{emBranco === 0 ? 'Todas as questões têm resposta.' : `${emBranco} ${emBranco === 1 ? 'questão ainda sem resposta' : 'questões ainda sem resposta'}`}</span>
            {paraRevisar.length > 0 && (
              <span>
                <span className="qz-badge qz-badge--alerta">★ Revisar</span>
                {paraRevisar.length === 1 ? '1 questão marcada' : `${paraRevisar.length} questões marcadas`}
              </span>
            )}
          </div>
          <Button largo onClick={() => setConfirmando(true)}>
            <Icone nome="enviar" />
            Enviar prova
          </Button>
        </aside>
      </div>

      <Dialog
        aberto={confirmando}
        titulo="Pronta para enviar?"
        aoFechar={() => setConfirmando(false)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setConfirmando(false)}>
              Continuar respondendo
            </Button>
            <Button
              onClick={() => {
                setConfirmando(false)
                void descarregarTudo().then(() => concluir())
              }}
            >
              <Icone nome="enviar" />
              Enviar definitivamente
            </Button>
          </>
        }
      >
        <div className="qz-al-revisao">
          <p className="qz-al-revisao__intro">Confira o resumo de {dados.prova.titulo} antes de finalizar sua tentativa.</p>
          <div className="qz-al-revisao__numeros">
            <div className="qz-al-revisao__respondidas">
              <strong>
                {respondidas} / {total}
              </strong>
              Questões respondidas
            </div>
            <div>
              <strong>{String(emBranco).padStart(2, '0')}</strong>
              Em branco
            </div>
          </div>
          <h3>Resumo das respostas</h3>
          <div className="qz-mapa">
            {dados.questoes.map((q, i) => (
              <button
                key={q.versaoQuestaoId}
                type="button"
                disabled={sequencial && i !== indice}
                className={`${respondida(respostas[q.versaoQuestaoId]) ? 'qz-mapa__respondida' : ''} ${i === indice ? 'qz-mapa__atual' : ''} ${marcadas.has(q.versaoQuestaoId) && !sequencial ? 'qz-mapa__revisar' : ''}`}
                aria-label={`Voltar à questão ${i + 1}${respondida(respostas[q.versaoQuestaoId]) ? ' (respondida)' : ' (em branco)'}`}
                onClick={() => {
                  setConfirmando(false)
                  void irPara(i)
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
          <AlertBanner
            tipo={emBranco > 0 ? 'alerta' : 'sucesso'}
            titulo={emBranco === 0 ? 'Tudo respondido' : emBranco === 1 ? '1 questão em branco' : `${emBranco} questões em branco`}
          >
            Você respondeu <strong>{respondidas}</strong> de <strong>{total}</strong> questões.
            {emBranco > 0 && ' Questões em branco serão consideradas sem resposta.'}
          </AlertBanner>
          {paraRevisar.length > 0 && (
            <AlertBanner tipo="alerta" titulo={paraRevisar.length === 1 ? '1 questão marcada para revisar' : `${paraRevisar.length} questões marcadas para revisar`}>
              Questões {paraRevisar.map(({ i }) => i + 1).join(', ')}. Você ainda pode voltar a elas antes de enviar.
            </AlertBanner>
          )}
          <AlertBanner tipo="info" titulo="O envio é definitivo">
            Depois de enviar não é possível alterar as respostas.
          </AlertBanner>
        </div>
      </Dialog>
    </div>
  )
}

/** Alternativa em linha com bordas: círculo com a letra (lilás quando marcada) e confirmação à direita. */
function Opcao({ letra, texto, marcada, children }: { letra?: string; texto: string; marcada: boolean; children: ReactNode }) {
  return (
    <label className="qz-opcao">
      <span className="qz-al-opcao__marca">
        {children}
        {letra && (
          <span className="qz-al-opcao__letra">
            {letra}
            <span className="qz-sr">)</span>
          </span>
        )}
      </span>
      <span className="qz-al-opcao__texto">
        <TextoRico texto={texto} />
      </span>
      {marcada && <Icone nome="check-circulo" className="qz-al-opcao__check" />}
    </label>
  )
}
