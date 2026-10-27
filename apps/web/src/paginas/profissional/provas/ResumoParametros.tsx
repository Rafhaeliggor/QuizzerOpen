import { ROTULO_EXIBICAO_GABARITO, type ParametrosProva } from '../../../api/tipos'

export function ResumoParametros({ prova }: { prova: ParametrosProva }) {
  const linhas: [string, string][] = [
    ['Visibilidade', prova.visibilidade === 'PUBLICA' ? 'Pública (PIN/link, resultado não certificado)' : 'Privada (turmas)'],
    [
      'Aprovação',
      prova.criterioAprovacao.tipo === 'NOTA_MINIMA' ? `Nota mínima ${prova.criterioAprovacao.valor ?? 6} (de 10)` : 'Sem critério',
    ],
    ['Tempo limite', prova.tempoLimiteMin ? `${prova.tempoLimiteMin} minutos` : 'Sem limite (janela da aplicação)'],
    ['Tentativas', String(prova.tentativasPermitidas)],
    ['Navegação', prova.modoNavegacao === 'LIVRE' ? 'Livre' : 'Sequencial (sem voltar)'],
    ['Ordem', prova.ordemQuestoes === 'FIXA' ? 'Fixa' : 'Randomizada por participante'],
    ['Gabarito para o aluno', ROTULO_EXIBICAO_GABARITO[prova.exibirGabarito ?? 'NUNCA']],
    ['Prazo para recurso', prova.prazoRecursoDias ? `${prova.prazoRecursoDias} dias após o resultado` : 'Sem prazo'],
    ['Verificação em duas etapas', prova.exigeMfa ? 'Exigida do aluno' : 'Não exigida'],
    ['Correção', prova.correcaoAsCegas ? 'Às cegas (nome oculto até o resultado)' : 'Com nome do participante'],
  ]
  return (
    <dl className="qz-definicoes">
      {linhas.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
      {prova.descricao && (
        <div style={{ gridColumn: '1 / -1' }}>
          <dt>Instruções</dt>
          <dd className="qz-pre">{prova.descricao}</dd>
        </div>
      )}
    </dl>
  )
}
