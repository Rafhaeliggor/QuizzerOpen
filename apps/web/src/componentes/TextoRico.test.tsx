import { render, waitFor } from '@testing-library/react'
import { formulaParaMathml, separarFormulas } from '../util/formulas'
import { TextoRico } from './TextoRico'

describe('TextoRico — fórmulas (ADR-0047)', () => {
  it('separa texto e fórmulas; "R$" não é delimitador', () => {
    expect(separarFormulas('Custa R$ 5. Calcule \\(x^2\\) e \\[\\frac{a}{b}\\]')).toEqual([
      { tipo: 'texto', valor: 'Custa R$ 5. Calcule ' },
      { tipo: 'formula', valor: 'x^2', destaque: false },
      { tipo: 'texto', valor: ' e ' },
      { tipo: 'formula', valor: '\\frac{a}{b}', destaque: true },
    ])
  })

  it('gera MathML sem estilos inline e sem links', () => {
    const html = formulaParaMathml('\\sqrt{2} + \\href{javascript:alert(1)}{x}')
    expect(html).toContain('<math')
    expect(html).not.toContain('style=')
    expect(html).not.toMatch(/href=|<a[ >]/)
    expect(html).toContain('<mtext>\\href</mtext>') // comando recusado vira texto
  })

  it('texto comum continua texto (sem HTML injetado)', async () => {
    const { container } = render(<TextoRico texto={'<img src=x onerror=alert(1)> e \\(1+1\\)'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
    // O KaTeX é carregado sob demanda (BUG-060): o MathML aparece assim que ele chega
    await waitFor(() => expect(container.querySelector('math')).not.toBeNull())
  })

  it('texto sem fórmula não espera o KaTeX', () => {
    const { container } = render(<TextoRico texto="Quanto é dois mais dois?" />)
    expect(container.textContent).toBe('Quanto é dois mais dois?')
    expect(container.querySelector('.qz-formula')).toBeNull()
  })

  it('LaTeX inválido não quebra a tela', () => {
    const { container } = render(<TextoRico texto={'\\(\\frac{1}{\\)'} />)
    expect(container.querySelector('.qz-formula')).not.toBeNull()
  })
})
