import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertBanner, DataTable, StatusBadge, TextField } from '.'

describe('design system', () => {
  it('StatusBadge aplica o tom padrão do status de domínio', () => {
    render(<StatusBadge status="EM_REVISAO" />)
    const badge = screen.getByText('em revisao')
    expect(badge).toHaveClass('qz-badge--info')
  })

  it('AlertBanner de erro é anunciado como alerta', () => {
    render(<AlertBanner tipo="erro">Falhou</AlertBanner>)
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou')
  })

  it('TextField associa rótulo e mensagem de erro ao input', () => {
    render(<TextField rotulo="E-mail" erro="Obrigatório" />)
    const input = screen.getByLabelText('E-mail')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Obrigatório')
  })

  it('DataTable mostra estado vazio e pagina', async () => {
    const aoMudarPagina = vi.fn()
    const { rerender } = render(
      <DataTable colunas={[{ chave: 'n', titulo: 'Nome', render: (l: { n: string }) => l.n }]} linhas={[]} chaveLinha={(l) => l.n} />,
    )
    expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument()

    rerender(
      <DataTable
        colunas={[{ chave: 'n', titulo: 'Nome', render: (l: { n: string }) => l.n }]}
        linhas={[{ n: 'Ana' }]}
        chaveLinha={(l) => l.n}
        paginacao={{ pagina: 1, tamanho: 1, total: 2, aoMudarPagina }}
      />,
    )
    expect(screen.getByRole('cell', { name: 'Ana' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(aoMudarPagina).toHaveBeenCalledWith(2)
  })
})
