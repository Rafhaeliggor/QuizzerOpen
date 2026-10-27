import type { ReactNode } from 'react'
import { ROTULO_APROVACAO, ROTULO_TENTATIVA, type Comprovante } from '../../api/tipos'
import { AlertBanner, Card, Icone, StatusBadge } from '../../design-system'
import { formatarDataHora, formatarNota } from '../../util/formato'
import '../../paginas/aluno/aluno.css'

/** Comprovante de submissão (RF06 passo 7). */
export function VisaoComprovante({ c, acoes }: { c: Comprovante; acoes?: ReactNode }) {
  return (
    <div className="qz-comprovante">
      <Card>
        <div className="qz-comprovante__selo" aria-hidden>
          <Icone nome="check" tamanho={28} />
        </div>
        <h1 style={{ textAlign: 'center' }}>Prova enviada</h1>
        <p className="qz-suave" style={{ textAlign: 'center', marginTop: 0 }}>
          Guarde o código abaixo: ele comprova o envio da sua tentativa.
        </p>
        {c.status === 'EXPIRADA' && (
          <AlertBanner tipo="alerta">O tempo terminou e as respostas salvas foram enviadas automaticamente.</AlertBanner>
        )}
        <dl className="qz-definicoes">
          <div>
            <dt>Prova</dt>
            <dd>{c.provaTitulo}</dd>
          </div>
          <div>
            <dt>Participante</dt>
            <dd>
              {c.participanteNome}
              <br />
              <small className="qz-suave">{c.participanteEmail}</small>
            </dd>
          </div>
          <div>
            <dt>Início</dt>
            <dd>{formatarDataHora(c.inicioEm)}</dd>
          </div>
          <div>
            <dt>Término</dt>
            <dd>{formatarDataHora(c.fimEm)}</dd>
          </div>
          <div>
            <dt>Respostas registradas</dt>
            <dd>
              {c.respostasRegistradas} de {c.totalQuestoes}
            </dd>
          </div>
          <div>
            <dt>Situação</dt>
            <dd>
              <StatusBadge status={c.status} rotulo={ROTULO_TENTATIVA[c.status]} />
            </dd>
          </div>
        </dl>
        <div className="qz-comprovante__codigo qz-al-comprovante__codigo">
          <span className="qz-pequeno">Código do comprovante</span>
          <strong>{c.codigo}</strong>
        </div>
        {c.resultado && 'notaFinal' in c.resultado && (
          <AlertBanner tipo="sucesso" titulo="Resultado">
            Nota {formatarNota(c.resultado.notaFinal)} — {ROTULO_APROVACAO[c.resultado.statusAprovacao]}
          </AlertBanner>
        )}
        {c.resultado && 'pendente' in c.resultado && (
          <AlertBanner tipo="info">Sua prova tem questões dissertativas. A nota será publicada após a correção.</AlertBanner>
        )}
        {!c.certificado && <p className="qz-suave qz-pequeno">Prova pública: resultado não certificado.</p>}
        {acoes && <div className="qz-linha" style={{ justifyContent: 'center', marginTop: 16 }}>{acoes}</div>}
      </Card>
    </div>
  )
}
