/**
 * Cliente HTTP da API.
 *
 * - O access token fica SOMENTE em memória (nunca em localStorage) — ver ADR-0006.
 * - O refresh token é um cookie httpOnly que o navegador envia sozinho para /api/v1/auth.
 * - Em 401, tenta renovar a sessão uma única vez (requisições simultâneas
 *   compartilham a mesma renovação) e repete a chamada original.
 */
const BASE = '/api/v1'

let accessToken: string | null = null
let renovacaoEmAndamento: Promise<string | null> | null = null
let aoExpirarSessao: (() => void) | null = null

/** Token atual (em memória) — usado pelo fluxo de notificações em tempo real. */
export function obterAccessToken(): string | null {
  return accessToken
}

export function definirAccessToken(token: string | null) {
  accessToken = token
}

export function registrarAoExpirarSessao(fn: () => void) {
  aoExpirarSessao = fn
}

export class ErroApi extends Error {
  readonly status: number
  readonly codigo?: string
  readonly detalhes: unknown

  constructor(status: number, corpo: unknown) {
    const c = (corpo ?? {}) as { message?: string | string[]; codigo?: string }
    const mensagem = Array.isArray(c.message) ? c.message.join('; ') : c.message
    super(mensagem || `Erro ${status}`)
    this.status = status
    this.codigo = c.codigo
    this.detalhes = corpo
  }
}

async function lerCorpo(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined
  const tipo = res.headers.get('content-type') ?? ''
  return tipo.includes('application/json') ? res.json() : res.text()
}

export async function renovarSessao(): Promise<string | null> {
  renovacaoEmAndamento ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
      if (!res.ok) return null
      const { accessToken: novo } = (await res.json()) as { accessToken: string }
      accessToken = novo
      return novo
    } catch {
      return null
    } finally {
      renovacaoEmAndamento = null
    }
  })()
  return renovacaoEmAndamento
}

interface Opcoes {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Não tenta renovar a sessão em 401 (usado nas rotas de login). */
  semRenovacao?: boolean
  /** Token próprio (participante externo de prova pública) em vez do access token. */
  token?: string
  /** 'blob' para downloads (CSV). */
  resposta?: 'json' | 'blob'
  /** Envio multipart (upload de arquivo) — o navegador define o Content-Type. */
  formulario?: FormData
  cabecalhos?: Record<string, string>
}

export async function api<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const executar = () =>
    fetch(`${BASE}${caminho}`, {
      method: opcoes.method ?? 'GET',
      credentials: 'same-origin',
      headers: {
        ...(opcoes.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...opcoes.cabecalhos,
        ...(opcoes.token
          ? { Authorization: `Bearer ${opcoes.token}` }
          : accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
      },
      body: opcoes.formulario ?? (opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined),
    })

  let res = await executar()
  if (res.status === 401 && !opcoes.semRenovacao && !opcoes.token && accessToken) {
    const novo = await renovarSessao()
    if (novo) {
      res = await executar()
    } else {
      accessToken = null
      aoExpirarSessao?.()
    }
  }

  if (res.ok && opcoes.resposta === 'blob') return (await res.blob()) as T
  const corpo = await lerCorpo(res)
  if (!res.ok) throw new ErroApi(res.status, corpo)
  return corpo as T
}

/** Baixa um arquivo da API (ex.: CSV de relatório) e dispara o download no navegador. */
export async function baixar(caminho: string, nomeArquivo: string): Promise<void> {
  const blob = await api<Blob>(caminho, { resposta: 'blob' })
  salvarArquivo(blob, nomeArquivo)
}

export function salvarArquivo(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Mensagem amigável para exibir ao usuário a partir de qualquer erro de chamada. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroApi) {
    if (erro.status === 429) return 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.'
    if (erro.status >= 500) return 'O servidor encontrou um erro. Tente novamente em instantes.'
    return erro.message
  }
  return 'Não foi possível conectar ao servidor. Verifique sua conexão.'
}
