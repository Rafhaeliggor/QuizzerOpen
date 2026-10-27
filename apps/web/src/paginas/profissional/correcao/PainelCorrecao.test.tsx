import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CorrecaoQuestao, NotaDetalhe } from '../../../api/tipos'
import { PainelCorrecao } from './TelaCorrecao'

const questao = (extra: Partial<CorrecaoQuestao> = {}): CorrecaoQuestao => ({
  id: 'q1',
  versaoQuestaoId: 'v1',
  ordem: 1,
  natureza: 'ABERTA',
  peso: '50',
  enunciado: 'Explique a meiose.',
  alternativas: null,
  gabarito: null,
  rubrica: null,
  resposta: { texto: 'Divisão celular.' },
  fracao: null,
  automatica: false,
  feedback: null,
  anulacao: null,
  ...extra,
})
const nota = { notaProvisoria: null, notaFinal: null } as NotaDetalhe

function montar(q: CorrecaoQuestao) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}>
      <PainelCorrecao notaId="n1" questao={q} bloqueada={false} nota={nota} />
    </QueryClientProvider>,
  )
}

describe('PainelCorrecao', () => {
  afterEach(() => vi.restoreAllMocks())

  it('questão ainda não corrigida começa em branco e não salva nota cheia por omissão', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    montar(questao())
    expect(screen.getByLabelText(/Pontuação/)).toHaveValue(null)
    const salvar = screen.getByRole('button', { name: /Salvar correção/ })
    expect(salvar).toBeDisabled()
    await userEvent.click(salvar)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('critérios começam vazios e o total só conta o que foi preenchido', async () => {
    montar(questao({ rubrica: { criterios: '', itens: [{ descricao: 'Cita a redução', pontos: 2 }, { descricao: 'Cita a variabilidade', pontos: 3 }] } as CorrecaoQuestao['rubrica'] }))
    expect(screen.getByLabelText('Pontos para: Cita a redução')).toHaveValue(null)
    expect(screen.getByText('0 de 5')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Pontos para: Cita a redução'), '2')
    expect(screen.getByRole('button', { name: /Salvar correção/ })).toBeDisabled() // falta um critério
    await userEvent.type(screen.getByLabelText('Pontos para: Cita a variabilidade'), '1')
    expect(screen.getByRole('button', { name: /Salvar correção/ })).toBeEnabled()
    expect(screen.getByText('3 de 5')).toBeInTheDocument()
  })

  it('arredonda o percentual para inteiro (a API só aceita inteiros)', () => {
    montar(questao())
    fireEvent.change(screen.getByLabelText(/Pontuação/), { target: { value: '62.6' } })
    expect(screen.getByLabelText(/Pontuação/)).toHaveValue(63)
  })
})
