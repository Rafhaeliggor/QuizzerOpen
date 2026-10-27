import { useState, type FormEvent } from 'react'
import { ROTULO_EXIBICAO_GABARITO, type ExibicaoGabarito, type ParametrosProva } from '../../../api/tipos'
import { Button, Card, Icone, Interruptor, SelectField, StatusBadge, TextArea, TextField } from '../../../design-system'
import { somenteParametros } from './padroes'
import './provas.css'

interface Props {
  inicial: ParametrosProva
  salvando: boolean
  rotuloSalvar: string
  aoSalvar: (p: ParametrosProva) => void
}

/** Passo 1 do assistente: dados gerais e parâmetros de aplicação (RF05). */
export function FormParametros({ inicial, salvando, rotuloSalvar, aoSalvar }: Props) {
  const [p, setP] = useState<ParametrosProva>(inicial)
  const [semLimite, setSemLimite] = useState(inicial.tempoLimiteMin == null)
  const [semPrazoRecurso, setSemPrazoRecurso] = useState(inicial.prazoRecursoDias == null)
  const set = <K extends keyof ParametrosProva>(k: K, v: ParametrosProva[K]) => setP((x) => ({ ...x, [k]: v }))

  function enviar(e: FormEvent) {
    e.preventDefault()
    aoSalvar(
      somenteParametros({
        ...p,
        tempoLimiteMin: semLimite ? null : p.tempoLimiteMin,
        prazoRecursoDias: semPrazoRecurso ? null : (p.prazoRecursoDias ?? 7),
        exigeMfa: p.visibilidade === 'PRIVADA' && !!p.exigeMfa,
      }),
    )
  }

  const resumo: [string, string][] = [
    ['Tempo por participante', semLimite ? 'Janela da aplicação' : p.tempoLimiteMin ? `${p.tempoLimiteMin} min` : '—'],
    ['Tentativas', String(p.tentativasPermitidas || '—')],
    ['Aprovação', p.criterioAprovacao.tipo === 'NOTA_MINIMA' ? `Nota ≥ ${p.criterioAprovacao.valor ?? 6}` : 'Sem critério'],
    ['Navegação', p.modoNavegacao === 'LIVRE' ? 'Livre' : 'Sequencial'],
    ['Ordem', p.ordemQuestoes === 'FIXA' ? 'Fixa' : 'Embaralhada'],
    ['Recurso', semPrazoRecurso ? 'Sem prazo' : `${p.prazoRecursoDias ?? 7} dias`],
  ]

  return (
    <form onSubmit={enviar} className="qz-duas-colunas">
      <div className="qz-pilha">
        <Card>
          <h2>Informações da prova</h2>
          <TextField rotulo="Título" required value={p.titulo} onChange={(e) => set('titulo', e.target.value)} />
          <TextArea
            rotulo="Instruções para o participante (opcional)"
            rows={3}
            value={p.descricao ?? ''}
            onChange={(e) => set('descricao', e.target.value)}
          />
          <SelectField
            rotulo="Visibilidade"
            value={p.visibilidade}
            onChange={(e) => set('visibilidade', e.target.value as ParametrosProva['visibilidade'])}
            ajuda={p.visibilidade === 'PUBLICA' ? 'Pode ser aplicada por PIN/link; resultado não certificado' : 'Somente alunos de turmas'}
            opcoes={[
              { valor: 'PRIVADA', rotulo: 'Privada (turmas, com login)' },
              { valor: 'PUBLICA', rotulo: 'Pública (PIN/link)' },
            ]}
          />
        </Card>

        <Card>
          <h2>Duração e tentativas</h2>
          <div className="qz-grade-campos">
            <TextField
              id="tempo"
              rotulo="Tempo limite (minutos)"
              type="number"
              min={1}
              max={600}
              disabled={semLimite}
              required={!semLimite}
              value={p.tempoLimiteMin ?? ''}
              onChange={(e) => set('tempoLimiteMin', Number(e.target.value))}
            />
            <TextField
              rotulo="Tentativas permitidas"
              type="number"
              min={1}
              max={10}
              required
              value={p.tentativasPermitidas}
              onChange={(e) => set('tentativasPermitidas', Number(e.target.value))}
            />
          </div>
          <Interruptor
            rotulo="Sem limite de tempo"
            descricao="O participante pode responder durante toda a janela da aplicação."
            checked={semLimite}
            onChange={(e) => setSemLimite(e.target.checked)}
          />
        </Card>

        <Card>
          <h2>Regras da avaliação</h2>
          <div className="qz-prv-regras">
            <Interruptor
              rotulo="Embaralhar questões e alternativas"
              descricao="Cada participante recebe as questões e as alternativas em uma ordem diferente."
              checked={p.ordemQuestoes === 'RANDOMIZADA'}
              onChange={(e) => set('ordemQuestoes', e.target.checked ? 'RANDOMIZADA' : 'FIXA')}
            />
            <Interruptor
              rotulo="Permitir voltar às questões anteriores"
              descricao="Desligado, a navegação é sequencial: respondeu, avançou."
              checked={p.modoNavegacao === 'LIVRE'}
              onChange={(e) => set('modoNavegacao', e.target.checked ? 'LIVRE' : 'SEQUENCIAL')}
            />
            <Interruptor
              rotulo="Exigir nota mínima para aprovação"
              descricao="Desligado, a prova não tem critério de aprovação."
              checked={p.criterioAprovacao.tipo === 'NOTA_MINIMA'}
              onChange={(e) => set('criterioAprovacao', e.target.checked ? { tipo: 'NOTA_MINIMA', valor: 6 } : { tipo: 'NENHUM' })}
            />
            {p.criterioAprovacao.tipo === 'NOTA_MINIMA' && (
              <div className="qz-prv-subcampo">
                <TextField
                  rotulo="Nota mínima (0 a 10)"
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  required
                  value={p.criterioAprovacao.valor ?? 6}
                  onChange={(e) => set('criterioAprovacao', { tipo: 'NOTA_MINIMA', valor: Number(e.target.value) })}
                />
              </div>
            )}
            <Interruptor
              rotulo="Limitar o prazo para recurso"
              descricao="Desligado, o participante pode contestar a correção a qualquer momento."
              checked={!semPrazoRecurso}
              onChange={(e) => setSemPrazoRecurso(!e.target.checked)}
            />
            {!semPrazoRecurso && (
              <div className="qz-prv-subcampo">
                <TextField
                  id="prazo-recurso"
                  rotulo="Prazo para recurso (dias após o resultado)"
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={p.prazoRecursoDias ?? 7}
                  onChange={(e) => set('prazoRecursoDias', Number(e.target.value))}
                />
              </div>
            )}
            <Interruptor
              rotulo="Correção às cegas"
              descricao="Quem corrige não vê o nome do participante até o resultado sair."
              checked={!!p.correcaoAsCegas}
              onChange={(e) => set('correcaoAsCegas', e.target.checked)}
            />
            {p.visibilidade === 'PRIVADA' && (
              <Interruptor
                rotulo="Exigir verificação em duas etapas do aluno para iniciar"
                descricao="Recomendado para provas que certificam."
                checked={!!p.exigeMfa}
                onChange={(e) => set('exigeMfa', e.target.checked)}
              />
            )}
          </div>
          <SelectField
            rotulo="Gabarito para o aluno"
            value={p.exibirGabarito ?? 'NUNCA'}
            onChange={(e) => set('exibirGabarito', e.target.value as ExibicaoGabarito)}
            ajuda="Quando o aluno passa a ver a resposta certa de cada questão no resultado"
            opcoes={(Object.keys(ROTULO_EXIBICAO_GABARITO) as ExibicaoGabarito[]).map((valor) => ({
              valor,
              rotulo: ROTULO_EXIBICAO_GABARITO[valor],
            }))}
          />
        </Card>
      </div>

      <aside className="qz-pilha">
        <Card className="qz-cartao--destaque qz-prv-resumo">
          <h2>Resumo da aplicação</h2>
          <StatusBadge status={p.visibilidade} tom="info" rotulo={p.visibilidade === 'PUBLICA' ? 'Pública (PIN/link)' : 'Privada (turmas)'} />
          <p className="qz-prv-resumo__titulo">{p.titulo.trim() || 'Prova sem título'}</p>
          <dl className="qz-prv-resumo__linhas">
            {resumo.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Button type="submit" largo carregando={salvando} disabled={!p.titulo.trim()}>
          <Icone nome="seta-direita" /> {rotuloSalvar}
        </Button>
      </aside>
    </form>
  )
}
