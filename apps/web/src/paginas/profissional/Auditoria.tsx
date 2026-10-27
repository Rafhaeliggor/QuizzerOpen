import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, baixar, mensagemDeErro } from '../../api/cliente'
import type { EventoAuditoria, Pagina } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { AlertBanner, Button, DataTable, Icone } from '../../design-system'
import { formatarDataHora } from '../../util/formato'
import './admin.css'

/** RF11 — Trilha de auditoria (somente leitura; o banco impede alteração). */
export function Auditoria() {
  const [acao, setAcao] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [pagina, setPagina] = useState(1)
  const filtro = new URLSearchParams()
  if (acao) filtro.set('acao', acao)
  if (de) filtro.set('de', de)
  if (ate) filtro.set('ate', ate)
  const consulta = useQuery({
    queryKey: ['auditoria', filtro.toString(), pagina],
    queryFn: () => api<Pagina<EventoAuditoria>>(`/auditoria?pagina=${pagina}&tamanho=50&${filtro.toString()}`),
  })
  const exportar = useMutation({
    mutationFn: (formato: 'csv' | 'xlsx') => baixar(`/auditoria/${formato}?${filtro.toString()}`, `auditoria.${formato}`),
  })
  const mudar = (f: (v: string) => void) => (v: string) => {
    f(v)
    setPagina(1)
  }
  return (
    <>
      <CabecalhoPagina
        titulo="Auditoria"
        descricao="Registro imutável de ações sensíveis: quem, quando, o quê e por quê."
        acoes={
          <>
            <Button variante="secundario" carregando={exportar.isPending} onClick={() => exportar.mutate('xlsx')}>
              <Icone nome="download" /> Excel
            </Button>
            <Button variante="secundario" onClick={() => exportar.mutate('csv')}>
              <Icone nome="download" /> CSV
            </Button>
          </>
        }
      />
      <div className="qz-barra-filtros qz-adm-filtros">
        <label className="qz-busca">
          <Icone nome="busca" />
          <input
            type="search"
            aria-label="Filtrar por ação"
            placeholder="Filtrar por ação (ex.: LOGIN, RECURSO, REABERTA)"
            value={acao}
            onChange={(e) => mudar(setAcao)(e.target.value)}
          />
        </label>
        <label className="qz-adm-data">
          <span>De</span>
          <input type="date" className="qz-input" value={de} onChange={(e) => mudar(setDe)(e.target.value)} />
        </label>
        <label className="qz-adm-data">
          <span>Até</span>
          <input type="date" className="qz-input" value={ate} onChange={(e) => mudar(setAte)(e.target.value)} />
        </label>
      </div>
      {(consulta.error || exportar.error) && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error ?? exportar.error)}</AlertBanner>}
      <p className="qz-adm-nota">A exportação traz até 10 mil eventos do filtro atual.</p>
      <DataTable
        rotulo="Eventos de auditoria"
        rotuloItens="eventos"
        carregando={consulta.isPending}
        linhas={consulta.data?.itens ?? []}
        chaveLinha={(e) => e.id}
        paginacao={consulta.data && { ...consulta.data, aoMudarPagina: setPagina }}
        colunas={[
          { chave: 'q', titulo: 'Quando', render: (e) => formatarDataHora(e.criadoEm) },
          { chave: 'a', titulo: 'Ação', render: (e) => <code className="qz-codigo">{e.acao}</code> },
          { chave: 'r', titulo: 'Recurso', render: (e) => `${e.recurso}${e.recursoId ? ` · ${e.recursoId.slice(0, 8)}` : ''}` },
          {
            chave: 'u',
            titulo: 'Usuário',
            render: (e) =>
              e.usuarioId ? (
                <span title={e.usuarioId}>{e.usuarioNome ?? e.usuarioId.slice(0, 8)}</span>
              ) : (
                'sistema/anônimo'
              ),
          },
          { chave: 'j', titulo: 'Justificativa / dados', render: (e) => e.justificativa ?? (e.dados ? JSON.stringify(e.dados) : '—') },
          { chave: 'ip', titulo: 'IP', render: (e) => e.ip ?? '—' },
        ]}
      />
    </>
  )
}
