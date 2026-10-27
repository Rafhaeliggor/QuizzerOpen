import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'fantasma'
  largo?: boolean
  carregando?: boolean
}

export function Button({ variante = 'primario', largo, carregando, className, disabled, children, ...resto }: Props) {
  const classes = ['qz-botao', `qz-botao--${variante}`, largo && 'qz-botao--largo', className].filter(Boolean)
  return (
    <button type="button" className={classes.join(' ')} disabled={disabled || carregando} aria-busy={carregando} {...resto}>
      {carregando && <span className="qz-spinner__circulo" aria-hidden />}
      {children}
    </button>
  )
}
