import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { api, mensagemDeErro } from '../../../api/cliente'
import {
  formatoDaQuestao,
  ROTULO_FORMATO,
  type Dificuldade,
  type FormatoQuestao,
  type Midia,
  type QuestaoDetalhe,
} from '../../../api/tipos'
import { CabecalhoPagina } from '../../../componentes/CabecalhoPagina'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { EditorMidias } from '../../../componentes/Midias'
import { TextoRico } from '../../../componentes/TextoRico'
import { lerNumero } from '../../../util/formato'
import { AlertBanner, Button, Card, Icone, SelectField, StatusBadge, TextArea, TextField } from '../../../design-system'
import './questoes.css'

interface Formulario {
  disciplina: string
  topico: string
  dificuldade: Dificuldade
  formato: FormatoQuestao
  enunciado: string
  alternativas: string[]
  /** Múltipla escolha: índice da correta · V/F: 0 = Verdadeiro, 1 = Falso. */
  alternativaCorreta: number
  rubrica: string
  /** Resposta curta: uma por linha. */
  respostasAceitas: string
  /** Várias corretas: índices marcados. */
  alternativasCorretas: number[]
  /** Resposta numérica (texto do campo, aceita vírgula). */
  valorNumerico: string
  tolerancia: string
  /** Associação: pares corretos e opções extras (uma por linha). */
  associacoes: { item: string; opcao: string }[]
  opcoesExtras: string
  /** Ordenação: itens na ordem correta. */
  itensOrdem: string[]
  /** Dissertativa: critérios com pontos (opcional). */
  rubricaItens: { descricao: string; pontos: number }[]
  midias: Midia[]
  altoRisco: boolean
}

const VAZIO: Formulario = {
  disciplina: '',
  topico: '',
  dificuldade: 'MEDIO',
  formato: 'MULTIPLA_ESCOLHA',
  enunciado: '',
  alternativas: ['', '', '', ''],
  alternativaCorreta: 0,
  rubrica: '',
  respostasAceitas: '',
  alternativasCorretas: [0],
  valorNumerico: '',
  tolerancia: '0',
  associacoes: [
    { item: '', opcao: '' },
    { item: '', opcao: '' },
  ],
  opcoesExtras: '',
  itensOrdem: ['', '', ''],
  rubricaItens: [],
  midias: [],
  altoRisco: false,
}

const LETRAS = 'ABCDEFGHIJ'
const ID_FORMULARIO = 'qz-form-questao'

export function NovaQuestao() {
  return <FormularioQuestao inicial={VAZIO} />
}

export function EditarQuestao() {
  const { id } = useParams()
  const consulta = useQuery({ queryKey: ['questao', id], queryFn: () => api<QuestaoDetalhe>(`/questoes/${id}`) })
  return (
    <EstadoConsulta consulta={consulta}>
      {(q) => {
        // Edita a partir da versão pendente (se houver) — senão, da mais recente.
        const v = q.versoes[0]!
        const formato = formatoDaQuestao(q)
        return (
          <FormularioQuestao
            id={q.id}
            publicada={!!q.publicadaEm}
            exigeAprovacao={!!q.publicadaEm && q.altoRisco}
            podeMarcarAltoRisco={q.podeMarcarAltoRisco}
            inicial={{
              disciplina: q.disciplina,
              topico: q.topico ?? '',
              dificuldade: q.dificuldade,
              formato,
              enunciado: v.enunciado,
              alternativas:
                formato === 'MULTIPLA_ESCOLHA' || formato === 'MULTIPLA_RESPOSTA'
                  ? (v.alternativas?.map((a) => a.texto) ?? ['', '', '', ''])
                  : ['', '', '', ''],
              alternativasCorretas: (v.gabarito?.alternativaIds ?? ['A']).map((id) => LETRAS.indexOf(id)).filter((i) => i >= 0),
              valorNumerico: v.gabarito?.valor != null ? String(v.gabarito.valor).replace('.', ',') : '',
              tolerancia: String(v.gabarito?.tolerancia ?? 0).replace('.', ','),
              associacoes: VAZIO.associacoes,
              opcoesExtras: '',
              itensOrdem: VAZIO.itensOrdem,
              rubricaItens: [],
              ...dadosEstruturados(v),
              alternativaCorreta:
                formato === 'VERDADEIRO_FALSO'
                  ? v.gabarito?.alternativaId === 'F'
                    ? 1
                    : 0
                  : Math.max(0, v.alternativas?.findIndex((a) => a.id === v.gabarito?.alternativaId) ?? 0),
              rubrica: v.rubrica?.criterios ?? '',
              respostasAceitas: (v.gabarito?.respostasAceitas ?? []).join('\n'),
              midias: v.midias ?? [],
              altoRisco: q.altoRisco,
            }}
          />
        )
      }}
    </EstadoConsulta>
  )
}

function FormularioQuestao({
  id,
  inicial,
  publicada,
  exigeAprovacao,
  podeMarcarAltoRisco = true,
}: {
  id?: string
  inicial: Formulario
  publicada?: boolean
  exigeAprovacao?: boolean
  podeMarcarAltoRisco?: boolean
}) {
  const navegar = useNavigate()
  const cliente = useQueryClient()
  const [f, setF] = useState<Formulario>(inicial)
  const atualizar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => setF((x) => ({ ...x, [campo]: valor }))

  const salvar = useMutation({
    mutationFn: () => {
      const especifico =
        f.formato === 'MULTIPLA_ESCOLHA'
          ? { alternativas: f.alternativas.map((texto) => ({ texto })), alternativaCorreta: f.alternativaCorreta }
          : f.formato === 'VERDADEIRO_FALSO'
            ? { alternativaCorreta: f.alternativaCorreta }
            : f.formato === 'RESPOSTA_CURTA'
              ? { respostasAceitas: f.respostasAceitas.split('\n').map((r) => r.trim()).filter(Boolean) }
              : f.formato === 'MULTIPLA_RESPOSTA'
                ? { alternativas: f.alternativas.map((texto) => ({ texto })), alternativasCorretas: f.alternativasCorretas }
                : f.formato === 'RESPOSTA_NUMERICA'
                  ? { valorNumerico: lerNumero(f.valorNumerico), tolerancia: lerNumero(f.tolerancia) ?? 0 }
                  : f.formato === 'ASSOCIACAO'
                    ? {
                        associacoes: f.associacoes,
                        opcoesExtras: f.opcoesExtras.split('\n').map((x) => x.trim()).filter(Boolean),
                      }
                    : f.formato === 'ORDENACAO'
                      ? { itensOrdem: f.itensOrdem }
                      : { rubrica: f.rubrica, rubricaItens: f.rubricaItens.filter((r) => r.descricao.trim()) }
      const corpo = {
        disciplina: f.disciplina,
        topico: f.topico || undefined,
        dificuldade: f.dificuldade,
        formato: f.formato,
        enunciado: f.enunciado,
        midiaIds: f.midias.map((m) => m.id),
        altoRisco: f.altoRisco,
        ...especifico,
      }
      return id
        ? api<{ id: string }>(`/questoes/${id}`, { method: 'PUT', body: corpo })
        : api<{ id: string }>('/questoes', { method: 'POST', body: corpo })
    },
    onSuccess: async (r) => {
      await cliente.invalidateQueries({ queryKey: ['questoes'] })
      await cliente.invalidateQueries({ queryKey: ['questao', r.id] })
      navegar(`/app/questoes/${r.id}`)
    },
  })

  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate()
  }

  const alterarAlternativa = (i: number, texto: string) =>
    atualizar('alternativas', f.alternativas.map((a, j) => (j === i ? texto : a)))
  const removerAlternativa = (i: number) => {
    setF((x) => ({
      ...x,
      alternativas: x.alternativas.filter((_, j) => j !== i),
      alternativaCorreta: x.alternativaCorreta === i ? 0 : x.alternativaCorreta > i ? x.alternativaCorreta - 1 : x.alternativaCorreta,
      alternativasCorretas: x.alternativasCorretas.filter((j) => j !== i).map((j) => (j > i ? j - 1 : j)),
    }))
  }
  const alternarCorreta = (i: number) =>
    atualizar(
      'alternativasCorretas',
      f.alternativasCorretas.includes(i) ? f.alternativasCorretas.filter((j) => j !== i) : [...f.alternativasCorretas, i].sort(),
    )
  const varias = f.formato === 'MULTIPLA_RESPOSTA'

  return (
    <>
      <CabecalhoPagina
        titulo={id ? 'Editar questão' : 'Nova questão'}
        descricao={
          id
            ? `${ROTULO_FORMATO[f.formato]} · Alterações não afetam avaliações já aplicadas.`
            : 'A questão fica como rascunho até ser enviada para revisão.'
        }
        voltar={{ para: id ? `/app/questoes/${id}` : '/app/questoes', rotulo: id ? 'Voltar para a questão' : 'Voltar para o banco de questões' }}
        acoes={
          <>
            <Button variante="secundario" onClick={() => navegar(-1)}>
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORMULARIO} carregando={salvar.isPending}>
              <Icone nome="check" /> {id ? 'Salvar alterações' : 'Salvar rascunho'}
            </Button>
          </>
        }
      />
      {publicada && !exigeAprovacao && (
        <AlertBanner tipo="info" titulo="Questão publicada">
          Salvar cria uma <strong>nova versão</strong>. Provas que já usam a versão anterior não são afetadas.
        </AlertBanner>
      )}
      {exigeAprovacao && (
        <AlertBanner tipo="alerta" titulo="Questão de alto risco">
          Salvar cria uma nova versão <strong>pendente de aprovação</strong> por outra pessoa. Até lá, as provas
          continuam usando a versão aprovada.
        </AlertBanner>
      )}
      {salvar.error && <AlertBanner tipo="erro">{mensagemDeErro(salvar.error)}</AlertBanner>}
      <form id={ID_FORMULARIO} onSubmit={enviar} className="qz-duas-colunas">
        <div className="qz-qst-principal">
          <Card className="qz-qst-cartao">
            <h2>Enunciado e tipo</h2>
            <div className="qz-qst-campos-2">
              <SelectField
                rotulo="Formato"
                value={f.formato}
                disabled={publicada}
                onChange={(e) => atualizar('formato', e.target.value as FormatoQuestao)}
                ajuda={f.formato === 'DISSERTATIVA' ? 'Correção manual obrigatória' : 'Correção automática'}
                opcoes={(Object.keys(ROTULO_FORMATO) as FormatoQuestao[]).map((valor) => ({ valor, rotulo: ROTULO_FORMATO[valor] }))}
              />
            </div>
            <TextArea
              rotulo="Enunciado"
              required
              rows={5}
              ajuda="Fórmulas em LaTeX: \( x^2 \) na linha ou \[ \frac{a}{b} \] em destaque."
              value={f.enunciado}
              onChange={(e) => atualizar('enunciado', e.target.value)}
            />
            {/\\[([]/.test(f.enunciado) && (
              <div className="qz-pre qz-previa" aria-label="Pré-visualização do enunciado">
                <TextoRico texto={f.enunciado} />
              </div>
            )}
            <EditorMidias midias={f.midias} aoAlterar={(m) => atualizar('midias', m)} />
          </Card>

          {f.formato === 'VERDADEIRO_FALSO' && (
            <Card className="qz-qst-cartao">
              <h2>Gabarito</h2>
              <fieldset className="qz-qst-grupo">
                <legend>A afirmação do enunciado é…</legend>
                <div className="qz-qst-opcoes">
                  <label className="qz-qst-opcao">
                    <input type="radio" name="vf" checked={f.alternativaCorreta === 0} onChange={() => atualizar('alternativaCorreta', 0)} />
                    Verdadeira
                  </label>
                  <label className="qz-qst-opcao">
                    <input type="radio" name="vf" checked={f.alternativaCorreta === 1} onChange={() => atualizar('alternativaCorreta', 1)} />
                    Falsa
                  </label>
                </div>
              </fieldset>
            </Card>
          )}

          {f.formato === 'RESPOSTA_CURTA' && (
            <Card className="qz-qst-cartao">
              <h2>Gabarito</h2>
              <TextArea
                rotulo="Respostas aceitas (uma por linha)"
                required
                rows={3}
                ajuda="A comparação ignora acentos, maiúsculas e espaços extras. Ex.: “Brasília” aceita “brasilia”."
                value={f.respostasAceitas}
                onChange={(e) => atualizar('respostasAceitas', e.target.value)}
              />
            </Card>
          )}

          {f.formato === 'RESPOSTA_NUMERICA' && (
            <Card className="qz-qst-cartao">
              <h2>Gabarito</h2>
              <div className="qz-qst-campos-2">
                <TextField
                  rotulo="Valor esperado"
                  required
                  inputMode="decimal"
                  value={f.valorNumerico}
                  erro={f.valorNumerico && lerNumero(f.valorNumerico) === null ? 'Número inválido' : undefined}
                  onChange={(e) => atualizar('valorNumerico', e.target.value)}
                />
                <TextField
                  rotulo="Tolerância (±)"
                  inputMode="decimal"
                  ajuda="Ex.: 0,01 aceita de 3,13 a 3,15 quando o valor é 3,14. Vírgula ou ponto."
                  value={f.tolerancia}
                  onChange={(e) => atualizar('tolerancia', e.target.value)}
                />
              </div>
            </Card>
          )}

          {(f.formato === 'MULTIPLA_ESCOLHA' || varias) && (
            <Card className="qz-qst-cartao">
              <h2>Alternativas</h2>
              <p className="qz-qst-subtitulo">
                {varias
                  ? 'Marque todas as corretas. Pontuação parcial: (corretas marcadas − erradas marcadas) ÷ total de corretas, nunca abaixo de zero.'
                  : 'Selecione a resposta correta. Uma alternativa deve ser o gabarito.'}
              </p>
              <fieldset className="qz-qst-grupo">
                <legend className="qz-sr">{varias ? 'Alternativas — marque todas as corretas' : 'Alternativas — marque a correta'}</legend>
                {f.alternativas.map((a, i) => {
                  const correta = varias ? f.alternativasCorretas.includes(i) : f.alternativaCorreta === i
                  return (
                    <div key={i} className={`qz-qst-linha${correta ? ' qz-qst-alternativa--correta' : ''}`}>
                      {varias ? (
                        <input
                          type="checkbox"
                          aria-label={`Alternativa ${LETRAS[i]} é correta`}
                          checked={correta}
                          onChange={() => alternarCorreta(i)}
                        />
                      ) : (
                        <input
                          type="radio"
                          name="correta"
                          aria-label={`Alternativa ${LETRAS[i]} é a correta`}
                          checked={correta}
                          onChange={() => atualizar('alternativaCorreta', i)}
                        />
                      )}
                      <span className="qz-qst-letra" aria-hidden>
                        {LETRAS[i]}
                      </span>
                      <input
                        className="qz-input"
                        aria-label={`Texto da alternativa ${LETRAS[i]}`}
                        required
                        value={a}
                        onChange={(e) => alterarAlternativa(i, e.target.value)}
                      />
                      {correta && <StatusBadge status="GABARITO" tom="sucesso" rotulo="Gabarito" />}
                      <Button
                        variante="fantasma"
                        className="qz-botao--icone"
                        disabled={f.alternativas.length <= 2}
                        onClick={() => removerAlternativa(i)}
                        aria-label={`Remover alternativa ${LETRAS[i]}`}
                      >
                        <Icone nome="lixeira" />
                      </Button>
                    </div>
                  )
                })}
              </fieldset>
              <Button
                variante="secundario"
                className="qz-qst-adicionar"
                disabled={f.alternativas.length >= 10}
                onClick={() => atualizar('alternativas', [...f.alternativas, ''])}
              >
                <Icone nome="mais" /> Adicionar alternativa
              </Button>
            </Card>
          )}

          {f.formato === 'ASSOCIACAO' && (
            <Card className="qz-qst-cartao">
              <h2>Pares corretos</h2>
              <p className="qz-qst-subtitulo">
                Coluna A → coluna B. O participante vê a coluna B embaralhada e liga cada item à opção certa. Acerto parcial por item.
              </p>
              <fieldset className="qz-qst-grupo">
                <legend className="qz-sr">Pares corretos (coluna A → coluna B)</legend>
                {f.associacoes.map((par, i) => (
                  <div key={i} className="qz-qst-linha">
                    <input
                      className="qz-input"
                      aria-label={`Item ${i + 1} (coluna A)`}
                      placeholder="Coluna A"
                      required
                      value={par.item}
                      onChange={(e) => atualizar('associacoes', f.associacoes.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))}
                    />
                    <Icone nome="seta-direita" className="qz-suave" />
                    <input
                      className="qz-input"
                      aria-label={`Opção correta do item ${i + 1} (coluna B)`}
                      placeholder="Coluna B"
                      required
                      value={par.opcao}
                      onChange={(e) => atualizar('associacoes', f.associacoes.map((x, j) => (j === i ? { ...x, opcao: e.target.value } : x)))}
                    />
                    <Button
                      variante="fantasma"
                      className="qz-botao--icone"
                      disabled={f.associacoes.length <= 2}
                      onClick={() => atualizar('associacoes', f.associacoes.filter((_, j) => j !== i))}
                      aria-label={`Remover par ${i + 1}`}
                    >
                      <Icone nome="lixeira" />
                    </Button>
                  </div>
                ))}
              </fieldset>
              <Button
                variante="secundario"
                className="qz-qst-adicionar"
                disabled={f.associacoes.length >= 10}
                onClick={() => atualizar('associacoes', [...f.associacoes, { item: '', opcao: '' }])}
              >
                <Icone nome="mais" /> Adicionar par
              </Button>
              <TextArea
                rotulo="Opções extras da coluna B (distratores, uma por linha — opcional)"
                rows={2}
                value={f.opcoesExtras}
                onChange={(e) => atualizar('opcoesExtras', e.target.value)}
              />
            </Card>
          )}

          {f.formato === 'ORDENACAO' && (
            <Card className="qz-qst-cartao">
              <h2>Ordem correta</h2>
              <p className="qz-qst-subtitulo">O participante recebe os itens embaralhados. Nota parcial pelos pares na ordem certa.</p>
              <fieldset className="qz-qst-grupo">
                <legend className="qz-sr">Itens na ordem correta</legend>
                {f.itensOrdem.map((it, i) => (
                  <div key={i} className="qz-qst-linha">
                    <span className="qz-qst-letra" aria-hidden>
                      {i + 1}
                    </span>
                    <input
                      className="qz-input"
                      aria-label={`Item ${i + 1} da ordem correta`}
                      required
                      value={it}
                      onChange={(e) => atualizar('itensOrdem', f.itensOrdem.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    <Button
                      variante="fantasma"
                      className="qz-botao--icone"
                      disabled={f.itensOrdem.length <= 2}
                      onClick={() => atualizar('itensOrdem', f.itensOrdem.filter((_, j) => j !== i))}
                      aria-label={`Remover item ${i + 1}`}
                    >
                      <Icone nome="lixeira" />
                    </Button>
                  </div>
                ))}
              </fieldset>
              <Button
                variante="secundario"
                className="qz-qst-adicionar"
                disabled={f.itensOrdem.length >= 10}
                onClick={() => atualizar('itensOrdem', [...f.itensOrdem, ''])}
              >
                <Icone nome="mais" /> Adicionar item
              </Button>
            </Card>
          )}

          {f.formato === 'DISSERTATIVA' && (
            <Card className="qz-qst-cartao">
              <h2>Correção</h2>
              <p className="qz-qst-subtitulo">Com critérios, quem corrige marca os pontos de cada um e a nota sai da soma.</p>
              <fieldset className="qz-qst-grupo">
                <legend>Critérios com pontos (opcional)</legend>
                {f.rubricaItens.map((r, i) => (
                  <div key={i} className="qz-qst-linha">
                    <input
                      className="qz-input"
                      aria-label={`Critério ${i + 1}`}
                      placeholder="Ex.: cita a função do ATP"
                      value={r.descricao}
                      onChange={(e) => atualizar('rubricaItens', f.rubricaItens.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))}
                    />
                    <input
                      className="qz-input qz-composicao__peso"
                      type="number"
                      min={0.25}
                      step={0.25}
                      aria-label={`Pontos do critério ${i + 1}`}
                      value={r.pontos}
                      onChange={(e) => atualizar('rubricaItens', f.rubricaItens.map((x, j) => (j === i ? { ...x, pontos: Number(e.target.value) } : x)))}
                    />
                    <span className="qz-suave">pts</span>
                    <Button
                      variante="fantasma"
                      className="qz-botao--icone"
                      onClick={() => atualizar('rubricaItens', f.rubricaItens.filter((_, j) => j !== i))}
                      aria-label={`Remover critério ${i + 1}`}
                    >
                      <Icone nome="lixeira" />
                    </Button>
                  </div>
                ))}
              </fieldset>
              <Button
                variante="secundario"
                className="qz-qst-adicionar"
                disabled={f.rubricaItens.length >= 20}
                onClick={() => atualizar('rubricaItens', [...f.rubricaItens, { descricao: '', pontos: 1 }])}
              >
                <Icone nome="mais" /> Adicionar critério
              </Button>
              <TextArea
                rotulo="Rubrica / critérios de correção"
                rows={4}
                ajuda="Orienta o corretor. O aluno não vê."
                value={f.rubrica}
                onChange={(e) => atualizar('rubrica', e.target.value)}
              />
            </Card>
          )}
        </div>

        <aside className="qz-qst-lateral">
          <Card className="qz-qst-cartao">
            <h2>Metadados</h2>
            <TextField rotulo="Disciplina" required value={f.disciplina} onChange={(e) => atualizar('disciplina', e.target.value)} />
            <TextField rotulo="Tópico (opcional)" value={f.topico} onChange={(e) => atualizar('topico', e.target.value)} />
            <SelectField
              rotulo="Dificuldade"
              value={f.dificuldade}
              onChange={(e) => atualizar('dificuldade', e.target.value as Dificuldade)}
              opcoes={[
                { valor: 'FACIL', rotulo: 'Fácil' },
                { valor: 'MEDIO', rotulo: 'Médio' },
                { valor: 'DIFICIL', rotulo: 'Difícil' },
              ]}
            />
            <label className="qz-qst-check">
              <input
                type="checkbox"
                checked={f.altoRisco}
                disabled={!podeMarcarAltoRisco}
                onChange={(e) => atualizar('altoRisco', e.target.checked)}
              />
              <span>
                Questão de alto risco / certificação
                <span className="qz-suave qz-pequeno">
                  Depois de publicada, cada alteração precisa ser aprovada por outra pessoa
                  {!podeMarcarAltoRisco && ' (só a coordenação muda esta marcação em questão publicada)'}.
                </span>
              </span>
            </label>
          </Card>
        </aside>
      </form>
    </>
  )
}

/** Converte a versão salva de volta para os campos de associação, ordenação e rubrica. */
function dadosEstruturados(v: QuestaoDetalhe['versoes'][number]) {
  const alt = v.alternativas ?? []
  const itens = alt.filter((a) => a.grupo === 'ITEM')
  const opcoes = alt.filter((a) => a.grupo === 'OPCAO')
  const pares = v.gabarito?.pares ?? {}
  const usadas = new Set(Object.values(pares))
  const porId = new Map(alt.map((a) => [a.id, a.texto]))
  return {
    ...(itens.length
      ? {
          associacoes: itens.map((i) => ({ item: i.texto, opcao: porId.get(pares[i.id] ?? '') ?? '' })),
          opcoesExtras: opcoes.filter((o) => !usadas.has(o.id)).map((o) => o.texto).join('\n'),
        }
      : {}),
    ...(v.gabarito?.ordem ? { itensOrdem: v.gabarito.ordem.map((id) => porId.get(id) ?? '') } : {}),
    ...(v.rubrica?.itens ? { rubricaItens: v.rubrica.itens } : {}),
  }
}
