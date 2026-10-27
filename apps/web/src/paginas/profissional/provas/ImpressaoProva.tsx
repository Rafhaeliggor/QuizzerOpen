import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api } from '../../../api/cliente'
import { formatoDaQuestao, ROTULO_FORMATO, type ItemProva, type ProvaDetalhe, alternativaCorreta, descreverNumerico } from '../../../api/tipos'
import { EstadoConsulta } from '../../../componentes/EstadoConsulta'
import { ListaMidias } from '../../../componentes/Midias'
import { AlertBanner, Button, Icone } from '../../../design-system'
import { TextoRico } from '../../../componentes/TextoRico'
import { RespostaEstruturada } from '../../../componentes/QuestaoEstruturada'

/**
 * Versão para impressão da prova (RF05): "Imprimir" do navegador → papel ou "Salvar como PDF".
 * Com gabarito, para o professor; sem gabarito, para aplicar em papel (ADR-0037).
 */
export function ImpressaoProva() {
  const { id } = useParams()
  const consulta = useQuery({ queryKey: ['prova', id], queryFn: () => api<ProvaDetalhe>(`/provas/${id}`) })
  const [comGabarito, setComGabarito] = useState(false)

  return (
    <EstadoConsulta consulta={consulta}>
      {(p) => (
        <div className="qz-impressao">
          <div className="qz-linha qz-nao-imprimir" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <Link to={`/app/provas/${p.id}`} className="qz-voltar" style={{ marginBottom: 0 }}>
              <Icone nome="seta-esquerda" tamanho={14} /> Voltar para a prova
            </Link>
            <label className="qz-linha">
              <input type="checkbox" checked={comGabarito} onChange={(e) => setComGabarito(e.target.checked)} />
              Incluir gabarito e rubricas
            </label>
            <Button onClick={() => window.print()}>Imprimir / salvar PDF</Button>
          </div>
          {p.secoes.some((s) => s.modo === 'SORTEIO') && (
            <div className="qz-nao-imprimir">
              <AlertBanner tipo="info">
                Esta prova sorteia questões por participante: a impressão traz o conjunto completo de cada seção de sorteio.
              </AlertBanner>
            </div>
          )}
          {comGabarito && (
            <div className="qz-nao-imprimir">
              <AlertBanner tipo="alerta">Versão COM gabarito — não entregue aos alunos.</AlertBanner>
            </div>
          )}

          <header style={{ marginBottom: 24 }}>
            <h1 style={{ marginBottom: 4 }}>
              {p.titulo}
              {comGabarito && ' — GABARITO'}
            </h1>
            {p.descricao && <p>{p.descricao}</p>}
            <p className="qz-pequeno">
              {p.itens.length} questões
              {p.tempoLimiteMin ? ` · ${p.tempoLimiteMin} minutos` : ''}
              {p.criterioAprovacao.tipo === 'NOTA_MINIMA' ? ` · aprovação com nota ≥ ${p.criterioAprovacao.valor}` : ''}
            </p>
            {!comGabarito && (
              <p>
                Nome: ________________________________________ Turma: ____________ Data: ___/___/______
              </p>
            )}
          </header>

          <ol style={{ paddingLeft: 20 }}>
            {p.itens.map((i, k) => (
              <li key={i.versaoQuestaoId} className="qz-questao-impressa">
                {i.secaoId && i.secaoId !== p.itens[k - 1]?.secaoId && (
                  <h2 style={{ fontSize: '1.1rem' }}>{p.secoes.find((s) => s.id === i.secaoId)?.titulo}</h2>
                )}
                <QuestaoImpressa item={i} comGabarito={comGabarito} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </EstadoConsulta>
  )
}

function QuestaoImpressa({ item, comGabarito }: { item: ItemProva; comGabarito: boolean }) {
  const formato = formatoDaQuestao(item)
  return (
    <>
      <div className="qz-pequeno qz-suave">
        {ROTULO_FORMATO[formato]} · peso {item.peso}%
      </div>
      <p className="qz-pre"><TextoRico texto={item.enunciado} /></p>
      <ListaMidias midias={item.midias} />
      {(formato === 'ASSOCIACAO' || formato === 'ORDENACAO') && (
        <RespostaEstruturada formato={formato} alternativas={item.alternativas} gabarito={comGabarito ? item.gabarito : null} />
      )}
      {formato === 'ASSOCIACAO' && !comGabarito && <p className="qz-pequeno">Escreva ao lado de cada item a letra/opção correspondente:</p>}
      {item.alternativas && formato !== 'ASSOCIACAO' && formato !== 'ORDENACAO' && (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {item.alternativas.map((a) => {
            const correta = comGabarito && alternativaCorreta(item.gabarito, a.id)
            return (
              <li key={a.id}>
                {correta ? '◉' : '○'} {formato === 'VERDADEIRO_FALSO' ? '' : `${a.id}) `}
                {correta ? <strong><TextoRico texto={a.texto} /> (correta)</strong> : <TextoRico texto={a.texto} />}
              </li>
            )
          })}
        </ul>
      )}
      {formato === 'RESPOSTA_NUMERICA' &&
        (comGabarito ? (
          <p className="qz-gabarito">Resposta esperada: {descreverNumerico(item.gabarito)}</p>
        ) : (
          <div className="qz-linhas-resposta" />
        ))}
      {formato === 'RESPOSTA_CURTA' &&
        (comGabarito ? (
          <p className="qz-gabarito">Respostas aceitas: {item.gabarito?.respostasAceitas?.join(' · ')}</p>
        ) : (
          <div className="qz-linhas-resposta" />
        ))}
      {formato === 'DISSERTATIVA' &&
        (comGabarito ? (
          <p className="qz-gabarito qz-pre">Rubrica: {item.rubrica?.criterios || '—'}</p>
        ) : (
          Array.from({ length: 6 }, (_, k) => <div key={k} className="qz-linhas-resposta" />)
        ))}
    </>
  )
}
