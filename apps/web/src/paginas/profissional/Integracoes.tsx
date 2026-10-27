import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api, mensagemDeErro } from '../../api/cliente'
import type { ChaveIntegracao } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { AlertBanner, Button, Card, DataTable, Dialog, Icone, StatusBadge, TextField } from '../../design-system'
import { formatarDataHora } from '../../util/formato'
import './admin.css'

/** API de integração com sistemas acadêmicos (LMS/ERP — ADR-0051): chaves por escopo. */
export function Integracoes() {
  const cliente = useQueryClient()
  const chaves = useQuery({ queryKey: ['integracao', 'chaves'], queryFn: () => api<ChaveIntegracao[]>('/integracao/chaves') })
  const escopos = useQuery({
    queryKey: ['integracao', 'escopos'],
    queryFn: () => api<{ codigo: string; descricao: string }[]>('/integracao/chaves/escopos'),
  })
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')
  const [marcados, setMarcados] = useState<string[]>([])
  const [validade, setValidade] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [revogando, setRevogando] = useState<ChaveIntegracao | null>(null)
  const atualizar = () => void cliente.invalidateQueries({ queryKey: ['integracao', 'chaves'] })
  const criar = useMutation({
    mutationFn: () =>
      api<{ token: string }>('/integracao/chaves', {
        method: 'POST',
        body: { nome, escopos: marcados, ...(validade ? { expiraEm: new Date(`${validade}T23:59:59`).toISOString() } : {}) },
      }),
    onSuccess: (r) => {
      setToken(r.token)
      setCriando(false)
      setNome('')
      setMarcados([])
      setValidade('')
      atualizar()
    },
  })
  const revogar = useMutation({
    mutationFn: (id: string) => api(`/integracao/chaves/${id}/revogar`, { method: 'POST' }),
    onSuccess: () => {
      setRevogando(null)
      atualizar()
    },
  })

  return (
    <>
      <CabecalhoPagina
        titulo="Integrações"
        descricao="Chaves para o sistema acadêmico (Moodle, ERP…) sincronizar turmas e ler notas pela API."
        acoes={
          <Button onClick={() => setCriando(true)}>
            <Icone nome="mais" /> Nova chave
          </Button>
        }
      />
      {token && (
        <AlertBanner tipo="alerta" titulo="Copie a chave agora — ela não será mostrada de novo">
          <code className="qz-codigo qz-adm-token">
            {token}
          </code>
          <div className="qz-acoes qz-adm-token-acoes">
            <Button variante="secundario" onClick={() => void navigator.clipboard?.writeText(token)}>
              Copiar
            </Button>
            <Button variante="fantasma" onClick={() => setToken(null)}>
              Já guardei
            </Button>
          </div>
        </AlertBanner>
      )}
      {chaves.error && <AlertBanner tipo="erro">{mensagemDeErro(chaves.error)}</AlertBanner>}
      <Card className="qz-adm-bloco">
        <h2>Chaves de integração</h2>
        <DataTable
          rotulo="Chaves de integração"
          carregando={chaves.isPending}
          linhas={chaves.data ?? []}
          chaveLinha={(c) => c.id}
          vazio="Nenhuma chave criada."
          colunas={[
            {
              chave: 'n',
              titulo: 'Nome',
              render: (c) => (
                <>
                  {c.nome}
                  <span className="qz-tabela__sub">
                    <code className="qz-codigo">qz_{c.prefixo}_…</code>
                  </span>
                </>
              ),
            },
            { chave: 'e', titulo: 'Escopos', render: (c) => c.escopos.join(', ') },
            { chave: 'u', titulo: 'Último uso', render: (c) => (c.ultimoUsoEm ? formatarDataHora(c.ultimoUsoEm) : 'nunca') },
            {
              chave: 's',
              titulo: 'Situação',
              render: (c) => (
                <StatusBadge
                  status={c.ativa ? 'ATIVA' : 'INATIVA'}
                  tom={c.ativa ? 'sucesso' : 'neutro'}
                  rotulo={c.ativa ? (c.expiraEm ? `ativa até ${formatarDataHora(c.expiraEm)}` : 'ativa') : c.revogadaEm ? 'revogada' : 'expirada'}
                />
              ),
            },
            {
              chave: 'a',
              titulo: '',
              render: (c) =>
                c.ativa && (
                  <Button variante="fantasma" onClick={() => (revogar.reset(), setRevogando(c))}>
                    Revogar
                  </Button>
                ),
            },
          ]}
        />
      </Card>
      <Card>
        <h2>Como usar</h2>
        <p className="qz-pequeno">
          Envie a chave no cabeçalho <code className="qz-codigo">Authorization: Bearer qz_…</code>. Rotas:{' '}
          <code className="qz-codigo">GET /api/v1/integracao/v1/notas?desde=…&amp;turma=…</code>,{' '}
          <code className="qz-codigo">GET /api/v1/integracao/v1/turmas</code> e{' '}
          <code className="qz-codigo">PUT /api/v1/integracao/v1/turmas/&lt;código&gt;</code>. Detalhes no guia de integração
          (docs/operacao/integracao.md).
        </p>
      </Card>

      <Dialog
        aberto={!!revogando}
        titulo="Revogar esta chave?"
        aoFechar={() => setRevogando(null)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setRevogando(null)}>
              Cancelar
            </Button>
            <Button carregando={revogar.isPending} onClick={() => revogando && revogar.mutate(revogando.id)}>
              Revogar
            </Button>
          </>
        }
      >
        <p>
          O sistema que usa <strong>{revogando?.nome}</strong> perde o acesso na hora. Não é possível reativar: será preciso criar
          outra chave.
        </p>
        {revogar.error && <AlertBanner tipo="erro">{mensagemDeErro(revogar.error)}</AlertBanner>}
      </Dialog>

      <Dialog
        aberto={criando}
        titulo="Nova chave de integração"
        aoFechar={() => setCriando(false)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
            <Button disabled={!nome.trim() || marcados.length === 0} carregando={criar.isPending} onClick={() => criar.mutate()}>
              Criar
            </Button>
          </>
        }
      >
        {criar.error && <AlertBanner tipo="erro">{mensagemDeErro(criar.error)}</AlertBanner>}
        <TextField rotulo="Nome (quem vai usar)" placeholder="ex.: Moodle da graduação" value={nome} onChange={(e) => setNome(e.target.value)} />
        <fieldset className="qz-fieldset">
          <legend>Permissões (escopos)</legend>
          {(escopos.data ?? []).map((e) => (
            <label key={e.codigo} className="qz-linha">
              <input
                type="checkbox"
                checked={marcados.includes(e.codigo)}
                onChange={() => setMarcados((x) => (x.includes(e.codigo) ? x.filter((y) => y !== e.codigo) : [...x, e.codigo]))}
              />
              <code className="qz-codigo">{e.codigo}</code> {e.descricao}
            </label>
          ))}
        </fieldset>
        <TextField rotulo="Válida até (opcional)" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
      </Dialog>
    </>
  )
}
