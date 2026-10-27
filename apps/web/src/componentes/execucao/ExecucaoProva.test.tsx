import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErroApi } from '../../api/cliente'
import type { Comprovante, ExecucaoPayload } from '../../api/tipos'
import { ExecucaoProva } from './ExecucaoProva'

function payload(parcial: Partial<ExecucaoPayload['tentativa']> = {}, navegacao: 'LIVRE' | 'SEQUENCIAL' = 'LIVRE'): ExecucaoPayload {
  const agora = new Date()
  return {
    tentativa: {
      id: 't1',
      numero: 1,
      status: 'EM_ANDAMENTO',
      inicioEm: agora.toISOString(),
      prazoEm: new Date(agora.getTime() + 30 * 60_000).toISOString(),
      fimEm: null,
      ...parcial,
    },
    agora: agora.toISOString(),
    prova: { titulo: 'Prova de teste', modoNavegacao: navegacao },
    questoes: [
      {
        versaoQuestaoId: 'q1',
        ordem: 1,
        natureza: 'FECHADA',
        enunciado: 'Quanto é 2 + 2?',
        alternativas: [
          { id: 'A', texto: '3' },
          { id: 'B', texto: '4' },
        ],
      },
      { versaoQuestaoId: 'q2', ordem: 2, natureza: 'ABERTA', enunciado: 'Explique.', alternativas: null },
    ],
    respostas: {},
  }
}

const comprovante = { codigo: 'ABC', tentativaId: 't1' } as Comprovante

describe('ExecucaoProva — marcar para revisar (feature 037)', () => {
  afterEach(() => localStorage.clear())
  const montar = (navegacao: 'LIVRE' | 'SEQUENCIAL' = 'LIVRE') =>
    render(
      <ExecucaoProva
        abrirSessao={async () => 's'}
        carregar={async () => payload({}, navegacao)}
        salvar={vi.fn().mockResolvedValue({})}
        enviar={vi.fn()}
        aoConcluir={vi.fn()}
      />,
    )

  it('marca a questão, destaca no mapa, avisa antes de enviar e guarda no navegador', async () => {
    const { unmount } = montar()
    await userEvent.click(await screen.findByRole('button', { name: '☆ Marcar para revisar' }))
    expect(screen.getByRole('button', { name: '★ Marcada para revisar' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Questão 1, marcada para revisar/ })).toHaveClass('qz-mapa__revisar')
    expect(screen.getByText('1 questão marcada')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Enviar prova/ }))
    expect(await screen.findByText('1 questão marcada para revisar')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('qz-revisar-t1')!)).toEqual(['q1'])
    // Recarregar a página mantém a marcação desta tentativa
    unmount()
    montar()
    expect(await screen.findByRole('button', { name: '★ Marcada para revisar' })).toBeInTheDocument()
  })

  it('navegação sequencial não oferece a marcação (não dá para voltar)', async () => {
    montar('SEQUENCIAL')
    await screen.findByText('Quanto é 2 + 2?')
    expect(screen.queryByRole('button', { name: /Marcar para revisar/ })).not.toBeInTheDocument()
  })
})

describe('ExecucaoProva', () => {
  it('salva automaticamente ao marcar uma alternativa', async () => {
    const salvar = vi.fn().mockResolvedValue({})
    render(<ExecucaoProva abrirSessao={async () => 'sessao-1'} carregar={async () => payload()} salvar={salvar} enviar={vi.fn()} aoConcluir={vi.fn()} />)
    await userEvent.click(await screen.findByLabelText(/4/))
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('q1', { alternativaId: 'B' }, 'sessao-1'))
    expect(await screen.findByText('Resposta salva ✓')).toBeInTheDocument()
  })

  it('mantém a resposta pendente e reenvia quando a rede falha', async () => {
    const salvar = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue({})
    render(<ExecucaoProva abrirSessao={async () => 'sessao-1'} carregar={async () => payload()} salvar={salvar} enviar={vi.fn()} aoConcluir={vi.fn()} />)
    await userEvent.click(await screen.findByLabelText(/4/))
    expect(await screen.findByText(/Sem conexão com o servidor/)).toBeInTheDocument()
    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(2), { timeout: 5000 })
    expect(salvar).toHaveBeenLastCalledWith('q1', { alternativaId: 'B' }, 'sessao-1')
    expect(await screen.findByText('Resposta salva ✓')).toBeInTheDocument()
  })

  it('se o servidor já encerrou a tentativa, conclui e mostra o comprovante', async () => {
    const salvar = vi.fn().mockRejectedValue(new ErroApi(409, { message: 'tempo', codigo: 'TENTATIVA_ENCERRADA' }))
    const enviar = vi.fn().mockResolvedValue(comprovante)
    const aoConcluir = vi.fn()
    render(<ExecucaoProva abrirSessao={async () => 'sessao-1'} carregar={async () => payload()} salvar={salvar} enviar={enviar} aoConcluir={aoConcluir} />)
    await userEvent.click(await screen.findByLabelText(/4/))
    await waitFor(() => expect(aoConcluir).toHaveBeenCalledWith(comprovante))
  })

  it('tentativa já enviada ao abrir vai direto ao comprovante', async () => {
    const enviar = vi.fn().mockResolvedValue(comprovante)
    const aoConcluir = vi.fn()
    render(<ExecucaoProva abrirSessao={async () => 'sessao-1'} carregar={async () => payload({ status: 'ENVIADA' })} salvar={vi.fn()} enviar={enviar} aoConcluir={aoConcluir} />)
    await waitFor(() => expect(aoConcluir).toHaveBeenCalledWith(comprovante))
  })

  it('envia automaticamente quando o tempo do servidor esgota', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const enviar = vi.fn().mockResolvedValue(comprovante)
      const aoConcluir = vi.fn()
      const agora = Date.now()
      render(
        <ExecucaoProva
          abrirSessao={async () => 'sessao-1'}
          carregar={async () => payload({ prazoEm: new Date(agora + 2000).toISOString() })}
          salvar={vi.fn()}
          enviar={enviar}
          aoConcluir={aoConcluir}
        />,
      )
      await screen.findByRole('timer')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      await waitFor(() => expect(aoConcluir).toHaveBeenCalledWith(comprovante))
      expect(enviar).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('confirma antes de enviar e informa questões em branco', async () => {
    const enviar = vi.fn().mockResolvedValue(comprovante)
    const aoConcluir = vi.fn()
    render(<ExecucaoProva abrirSessao={async () => 'sessao-1'} carregar={async () => payload()} salvar={vi.fn()} enviar={enviar} aoConcluir={aoConcluir} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar prova' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Você respondeu 0 de 2 questões')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar definitivamente' }))
    await waitFor(() => expect(aoConcluir).toHaveBeenCalled())
  })

  it('navegação sequencial não permite voltar', async () => {
    render(<ExecucaoProva abrirSessao={async () => 'sessao-1'} carregar={async () => payload({}, 'SEQUENCIAL')} salvar={vi.fn().mockResolvedValue({})} enviar={vi.fn()} aoConcluir={vi.fn()} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Próxima →' }))
    expect(screen.getByText('Explique.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '← Anterior' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Questão 1' })).toBeDisabled()
  })

  it('sessão substituída: para de salvar e permite assumir a prova neste dispositivo', async () => {
    const salvar = vi.fn().mockRejectedValueOnce(new ErroApi(409, { message: 'outro', codigo: 'SESSAO_SUBSTITUIDA' })).mockResolvedValue({})
    const abrirSessao = vi.fn().mockResolvedValueOnce('s1').mockResolvedValueOnce('s2')
    const enviar = vi.fn()
    render(<ExecucaoProva carregar={async () => payload()} abrirSessao={abrirSessao} salvar={salvar} enviar={enviar} aoConcluir={vi.fn()} />)
    await userEvent.click(await screen.findByLabelText(/4/))
    expect(await screen.findByText('Prova aberta em outro lugar')).toBeInTheDocument()
    expect(enviar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Continuar neste dispositivo' }))
    await userEvent.click(await screen.findByLabelText(/3/))
    await waitFor(() => expect(salvar).toHaveBeenLastCalledWith('q1', { alternativaId: 'A' }, 's2'))
    expect(abrirSessao).toHaveBeenCalledTimes(2)
  })

  it('V/F sem letras, resposta curta em campo de texto e mídia exibida (lote 6)', async () => {
    const salvar = vi.fn().mockResolvedValue({})
    const p = payload()
    p.questoes = [
      {
        versaoQuestaoId: 'vf',
        ordem: 1,
        natureza: 'FECHADA',
        formato: 'VERDADEIRO_FALSO',
        enunciado: 'O mapa mostra o Brasil.',
        alternativas: [
          { id: 'V', texto: 'Verdadeiro' },
          { id: 'F', texto: 'Falso' },
        ],
        midias: [{ id: 'm', tipo: 'IMAGEM', url: '/api/v1/midias/abc', nomeOriginal: 'mapa.png' }],
      },
      { versaoQuestaoId: 'rc', ordem: 2, natureza: 'FECHADA', formato: 'RESPOSTA_CURTA', enunciado: 'Capital?', alternativas: null },
    ]
    render(<ExecucaoProva abrirSessao={async () => 's'} carregar={async () => p} salvar={salvar} enviar={vi.fn()} aoConcluir={vi.fn()} />)
    expect(await screen.findByRole('img', { name: /mapa\.png/ })).toHaveAttribute('src', '/api/v1/midias/abc')
    expect(screen.queryByText('A)')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Falso'))
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('vf', { alternativaId: 'F' }, 's'))

    await userEvent.click(screen.getByRole('button', { name: 'Próxima →' }))
    const campo = await screen.findByLabelText('Sua resposta (curta)')
    expect(campo).toHaveAttribute('maxLength', '500')
    await userEvent.type(campo, 'Brasília')
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('rc', { texto: 'Brasília' }, 's'), { timeout: 3000 })
  })

  it('registra saída e volta da aba quando a página fica oculta (lote 6)', async () => {
    const registrarEvento = vi.fn().mockResolvedValue({})
    render(
      <ExecucaoProva
        abrirSessao={async () => 's'}
        carregar={async () => payload()}
        salvar={vi.fn().mockResolvedValue({})}
        enviar={vi.fn()}
        aoConcluir={vi.fn()}
        registrarEvento={registrarEvento}
      />,
    )
    await screen.findByText('Quanto é 2 + 2?')
    const visibilidade = vi.spyOn(document, 'visibilityState', 'get')
    try {
      visibilidade.mockReturnValue('hidden')
      act(() => void document.dispatchEvent(new Event('visibilitychange')))
      visibilidade.mockReturnValue('visible')
      act(() => void document.dispatchEvent(new Event('visibilitychange')))
      expect(registrarEvento.mock.calls).toEqual([['SAIU_DA_PROVA'], ['VOLTOU_A_PROVA']])
      expect(screen.getByText(/ficam registradas para o professor/)).toBeInTheDocument()
    } finally {
      visibilidade.mockRestore()
    }
  })

  it('várias corretas em caixas de seleção e resposta numérica (lote 7)', async () => {
    const salvar = vi.fn().mockResolvedValue({})
    const p = payload()
    p.questoes = [
      {
        versaoQuestaoId: 'mr',
        ordem: 1,
        natureza: 'FECHADA',
        formato: 'MULTIPLA_RESPOSTA',
        enunciado: 'Quais são primos? \\(p > 1\\)',
        alternativas: [
          { id: 'A', texto: '2' },
          { id: 'B', texto: '4' },
          { id: 'C', texto: '5' },
        ],
      },
      { versaoQuestaoId: 'nu', ordem: 2, natureza: 'FECHADA', formato: 'RESPOSTA_NUMERICA', enunciado: 'Pi?', alternativas: null },
    ]
    const { container } = render(
      <ExecucaoProva abrirSessao={async () => 's'} carregar={async () => p} salvar={salvar} enviar={vi.fn()} aoConcluir={vi.fn()} />,
    )
    await screen.findByText(/Quais são primos/)
    await waitFor(() => expect(container.querySelector('math')).not.toBeNull()) // KaTeX sob demanda
    await userEvent.click(screen.getByRole('checkbox', { name: /2/ }))
    await waitFor(() => expect(salvar).toHaveBeenLastCalledWith('mr', { alternativaIds: ['A'] }, 's'))
    await userEvent.click(screen.getByRole('checkbox', { name: /5/ }))
    await waitFor(() => expect(salvar).toHaveBeenLastCalledWith('mr', { alternativaIds: ['A', 'C'] }, 's'))

    await userEvent.click(screen.getByRole('button', { name: 'Próxima →' }))
    const campo = await screen.findByLabelText('Sua resposta (número)')
    expect(campo).toHaveAttribute('inputMode', 'decimal')
    await userEvent.type(campo, '3,14')
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('nu', { texto: '3,14' }, 's'), { timeout: 3000 })
  })
})
