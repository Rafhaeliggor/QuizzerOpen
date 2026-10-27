import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ROTULO_PAPEL } from '../api/tipos'
import { useAuth } from '../auth/contexto'
import { Icone } from '../design-system'
import { iniciais } from '../util/formato'

/** Nome + papel com menu suspenso (conta e saída). `compacto` = variante do ambiente do aluno, com avatar. */
export function MenuUsuario({ compacto }: { compacto?: boolean }) {
  const { usuario, sair } = useAuth()
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  if (!usuario) return null
  const aluno = usuario.ambiente === 'ALUNO'
  return (
    <div className="qz-usuario" ref={caixa}>
      <button
        type="button"
        className="qz-usuario__botao"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Menu de ${usuario.nome}`}
        onClick={() => setAberto((v) => !v)}
      >
        {compacto ? (
          <>
            <span className="qz-avatar" aria-hidden>
              {iniciais(usuario.nome)}
            </span>
            <span className="qz-usuario__nome">{usuario.nome.split(' ').slice(0, 2).join(' ')}</span>
          </>
        ) : (
          <>
            <span className="qz-usuario__textos">
              <strong>{usuario.nome}</strong>
              <span>{ROTULO_PAPEL[usuario.papel]}</span>
            </span>
            <Icone nome="chevron-baixo" tamanho={16} />
          </>
        )}
      </button>
      {aberto && (
        <div className="qz-usuario__menu" role="menu">
          <Link role="menuitem" to={aluno ? '/aluno/conta' : '/app/conta'} onClick={() => setAberto(false)}>
            {aluno ? 'Minha conta' : 'Configurações da conta'}
          </Link>
          <button type="button" role="menuitem" onClick={() => void sair()}>
            <Icone nome="sair" tamanho={16} /> Sair
          </button>
        </div>
      )}
    </div>
  )
}
