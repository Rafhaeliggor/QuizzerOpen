import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { api, mensagemDeErro } from '../api/cliente'
import { escutarNotificacoes } from '../api/fluxo'
import type { Notificacao } from '../api/tipos'
import { AlertBanner } from '../design-system'
import { formatarDataHora } from '../util/formato'

/** Notificações in-app (RF10): contador + lista, em tempo real (SSE) e com consulta de reserva a cada 5 min. */
export function SinoNotificacoes() {
  const cliente = useQueryClient()
  const navegar = useNavigate()
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  const consulta = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => api<{ naoLidas: number; itens: Notificacao[] }>('/notificacoes'),
    refetchInterval: 5 * 60_000,
  })
  // Tempo real (lote 8): ao sinal do servidor, recarrega a lista.
  useEffect(() => escutarNotificacoes(() => void cliente.invalidateQueries({ queryKey: ['notificacoes'] })), [cliente])
  const marcar = useMutation({
    mutationFn: (id: string) => api(`/notificacoes/${id}/lida`, { method: 'POST' }),
    onSettled: () => cliente.invalidateQueries({ queryKey: ['notificacoes'] }),
  })
  const marcarTodas = useMutation({
    mutationFn: () => api('/notificacoes/lidas', { method: 'POST' }),
    onSettled: () => cliente.invalidateQueries({ queryKey: ['notificacoes'] }),
  })

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

  const naoLidas = consulta.data?.naoLidas ?? 0
  // Falha ao marcar como lida (BUG-059): antes sumia em silêncio; fica visível ao reabrir o painel.
  const erroAcao = marcar.error ?? marcarTodas.error
  return (
    <div className="qz-sino" ref={caixa}>
      <button
        type="button"
        className="qz-botao qz-botao--fantasma qz-sino__botao"
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ''}`}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {naoLidas > 0 && <span className="qz-sino__contador">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>
      {aberto && (
        <div className="qz-sino__painel" role="dialog" aria-label="Notificações">
          <div className="qz-sino__topo">
            <strong>Notificações</strong>
            {naoLidas > 0 && (
              <button type="button" className="qz-link" onClick={() => marcarTodas.mutate()}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          {erroAcao && (
            <AlertBanner tipo="erro">Não foi possível marcar como lida: {mensagemDeErro(erroAcao)}</AlertBanner>
          )}
          {consulta.data?.itens.length ? (
            <ul className="qz-sino__lista">
              {consulta.data.itens.map((n) => (
                <li key={n.id} className={n.lida ? '' : 'qz-sino__item--nova'}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.lida) marcar.mutate(n.id)
                      setAberto(false)
                      if (n.link) navegar(n.link)
                    }}
                  >
                    <strong>{n.titulo}</strong>
                    <span>{n.mensagem}</span>
                    <small>{formatarDataHora(n.criadoEm)}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="qz-sino__vazio">
              {consulta.isPending ? 'Carregando…' : consulta.error ? 'Não foi possível carregar as notificações.' : 'Nenhuma notificação.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
