import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntradaAssociacao, EntradaOrdenacao, RespostaEstruturada } from './QuestaoEstruturada'

const assoc = [
  { id: 'I1', texto: 'Brasil', grupo: 'ITEM' as const },
  { id: 'I2', texto: 'Chile', grupo: 'ITEM' as const },
  { id: 'O1', texto: 'Brasília', grupo: 'OPCAO' as const },
  { id: 'O2', texto: 'Santiago', grupo: 'OPCAO' as const },
]
const ordem = [
  { id: 'A', texto: 'Colônia' },
  { id: 'B', texto: 'Império' },
  { id: 'C', texto: 'República' },
]

describe('associação e ordenação (lote 8)', () => {
  it('associação: escolher a opção de um item envia os pares', async () => {
    const aoMudar = vi.fn()
    render(<EntradaAssociacao alternativas={assoc} valor={{ pares: { I2: 'O2' } }} aoMudar={aoMudar} />)
    await userEvent.selectOptions(screen.getByLabelText('Opção para o item 1'), 'O1')
    expect(aoMudar).toHaveBeenCalledWith({ pares: { I1: 'O1', I2: 'O2' } })
  })

  it('ordenação: confirmar a ordem apresentada ou mover um item', async () => {
    const aoMudar = vi.fn()
    const { rerender } = render(<EntradaOrdenacao alternativas={ordem} valor={undefined} aoMudar={aoMudar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar esta ordem' }))
    expect(aoMudar).toHaveBeenLastCalledWith({ ordem: ['A', 'B', 'C'] })
    rerender(<EntradaOrdenacao alternativas={ordem} valor={{ ordem: ['A', 'B', 'C'] }} aoMudar={aoMudar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Descer item 1' }))
    expect(aoMudar).toHaveBeenLastCalledWith({ ordem: ['B', 'A', 'C'] })
  })

  it('impressão sem gabarito não revela a ordem certa (lista em ordem alfabética)', () => {
    const invertida = [
      { id: 'A', texto: 'Zebra' },
      { id: 'B', texto: 'Abelha' },
    ]
    const { container } = render(<RespostaEstruturada formato="ORDENACAO" alternativas={invertida} />)
    expect([...container.querySelectorAll('li')].map((l) => l.textContent)).toEqual(['Abelha', 'Zebra'])
  })

  it('correção mostra resposta certa e errada por item', () => {
    render(<RespostaEstruturada formato="ASSOCIACAO" alternativas={assoc} resposta={{ pares: { I1: 'O1', I2: 'O1' } }} gabarito={{ pares: { I1: 'O1', I2: 'O2' } }} />)
    expect(screen.getAllByText('Brasília')[0]!.closest('td')).toHaveClass('qz-certo')
    expect(screen.getAllByText('Brasília')[2]!.closest('td')).toHaveClass('qz-errado') // [1] é a coluna "Correta"
  })
})
