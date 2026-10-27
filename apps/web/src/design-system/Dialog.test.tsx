import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button, Dialog, TextArea } from '.'

/** Como as páginas usam: estado do campo no pai e `aoFechar` criado a cada render. */
function Pagina() {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  return (
    <>
      <Button onClick={() => setAberto(true)}>Abrir</Button>
      <Dialog
        aberto={aberto}
        titulo="Confirmar"
        aoFechar={() => setAberto(false)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button>Enviar</Button>
          </>
        }
      >
        <TextArea rotulo="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('digitar tecla a tecla num campo do diálogo não perde o foco (BUG-058)', async () => {
    const u = userEvent.setup()
    render(<Pagina />)
    await u.click(screen.getByRole('button', { name: 'Abrir' }))
    const campo = screen.getByLabelText('Motivo')
    await u.click(campo)
    await u.keyboard('não quero mais')
    expect(campo).toHaveValue('não quero mais')
    expect(campo).toHaveFocus()
  })

  it('Tab fica preso no diálogo; Esc fecha e devolve o foco a quem abriu', async () => {
    const u = userEvent.setup()
    render(<Pagina />)
    const abrir = screen.getByRole('button', { name: 'Abrir' })
    await u.click(abrir)
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    await u.tab() // do último controle volta ao primeiro, sem escapar para a página
    expect(screen.getByLabelText('Motivo')).toHaveFocus()
    await u.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveFocus()
    await u.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })
})
