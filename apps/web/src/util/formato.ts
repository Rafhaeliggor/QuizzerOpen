const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' })

export function formatarDataHora(iso: string | null | undefined): string {
  return iso ? dataHora.format(new Date(iso)) : '—'
}

/** Datas "puras" (período de turma) vêm como meia-noite UTC. */
export function formatarData(iso: string | null | undefined): string {
  return iso ? data.format(new Date(iso)) : '—'
}

export function formatarNota(valor: string | number | null | undefined): string {
  if (valor == null || valor === '') return '—'
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

export function formatarPercentual(valor: number | null | undefined): string {
  return valor == null ? '—' : `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

export function formatarDuracao(min: number | null | undefined): string {
  if (min == null) return '—'
  if (min < 1) return `${Math.round(min * 60)} s`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h ? `${h} h ${m} min` : `${m} min`
}

/** Valor para <input type="datetime-local"> no fuso do navegador. */
export function paraInputDataHora(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "2026-10-10T14:30" (hora local) → ISO UTC. */
export function deInputDataHora(valor: string): string {
  return new Date(valor).toISOString()
}

export function resumir(texto: string, max = 140): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto
}

/** Número digitado à brasileira ou não ("3,14", "3.14", "1.234,5"); null se inválido. Igual à API. */
export function lerNumero(texto: string): number | null {
  let t = texto.trim().replace(/\s/g, '')
  if (!/^[-+]?[\d.,]+$/.test(t)) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if ((t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Iniciais do nome para o avatar ("Ana Luiza Santos" → "AL"). */
export function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
