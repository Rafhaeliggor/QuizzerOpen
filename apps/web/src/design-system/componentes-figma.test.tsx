import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { DataTable, Interruptor, Metrica, Stepper, Tabs } from '.'

describe('componentes do visual Figma', () => {
  it('DataTable numera as páginas e mostra o intervalo exibido', async () => {
    const aoMudarPagina = vi.fn()
    render(
      <DataTable
        colunas={[{ chave: 'n', titulo: 'Nome', render: (l: { n: string }) => l.n }]}
        linhas={[{ n: 'Ana' }]}
        chaveLinha={(l) => l.n}
        rotuloItens="questões"
        paginacao={{ pagina: 1, tamanho: 6, total: 248, aoMudarPagina }}
      />,
    )
    expect(screen.getByText('Mostrando 1–6 de 248 questões')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Página 42' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Página 3' }))
    expect(aoMudarPagina).toHaveBeenCalledWith(3)
  })

  it('Interruptor é um switch associado ao rótulo', async () => {
    const aoMudar = vi.fn()
    render(<Interruptor rotulo="Embaralhar alternativas" descricao="Cada aluno recebe outra ordem." onChange={aoMudar} />)
    const chave = screen.getByRole('switch', { name: /Embaralhar alternativas/ })
    await userEvent.click(chave)
    expect(chave).toBeChecked()
    expect(aoMudar).toHaveBeenCalled()
  })

  it('Metrica vira link quando recebe destino', () => {
    render(
      <MemoryRouter>
        <Metrica rotulo="Correções pendentes" valor="12" detalhe="8 alunos" tom="alerta" para="/app/correcoes" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Correções pendentes\s*12/ })).toHaveAttribute('href', '/app/correcoes')
  })

  it('Stepper marca a etapa atual e as concluídas', () => {
    render(<Stepper passos={['Montagem', 'Aplicação', 'Revisão e publicação']} atual={1} />)
    expect(screen.getByText('1. Montagem concluída')).toBeInTheDocument()
    expect(screen.getByText('2. Aplicação').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('Tabs mostra o contador entre parênteses', () => {
    render(<Tabs rotulo="Situação" abas={[{ valor: 'p', rotulo: 'Pendentes', contador: 2 }]} ativa="p" aoMudar={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Pendentes (2)' })).toHaveAttribute('aria-selected', 'true')
  })
})
