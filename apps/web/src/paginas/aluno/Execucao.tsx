import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { api } from '../../api/cliente'
import type { Comprovante, ExecucaoPayload, ValorResposta } from '../../api/tipos'
import { ExecucaoProva } from '../../componentes/execucao/ExecucaoProva'
import { BarraAluno } from '../../layouts/LayoutAluno'

export function ExecucaoAluno() {
  const { id } = useParams()
  const navegar = useNavigate()
  const carregar = useCallback(() => api<ExecucaoPayload>(`/aluno/tentativas/${id}`), [id])
  const abrirSessao = useCallback(
    async () => (await api<{ sessaoExecucao: string }>(`/aluno/tentativas/${id}/sessao`, { method: 'POST' })).sessaoExecucao,
    [id],
  )
  const salvar = useCallback(
    (vq: string, valor: ValorResposta, sessao: string) =>
      api(`/aluno/tentativas/${id}/respostas/${vq}`, { method: 'PUT', body: valor, cabecalhos: { 'X-Sessao-Execucao': sessao } }),
    [id],
  )
  const enviar = useCallback(
    (sessao: string) => api<Comprovante>(`/aluno/tentativas/${id}/enviar`, { method: 'POST', cabecalhos: { 'X-Sessao-Execucao': sessao } }),
    [id],
  )
  const aoConcluir = useCallback((c: Comprovante) => navegar(`/aluno/comprovante/${id}`, { replace: true, state: c }), [id, navegar])
  const registrarEvento = useCallback(
    (tipo: 'SAIU_DA_PROVA' | 'VOLTOU_A_PROVA') =>
      api(`/aluno/tentativas/${id}/eventos`, { method: 'POST', body: { tipo, ocorridoEm: new Date().toISOString() } }),
    [id],
  )
  return (
    <>
      <BarraAluno />
      <ExecucaoProva
        carregar={carregar}
        abrirSessao={abrirSessao}
        salvar={salvar}
        enviar={enviar}
        aoConcluir={aoConcluir}
        registrarEvento={registrarEvento}
      />
    </>
  )
}
