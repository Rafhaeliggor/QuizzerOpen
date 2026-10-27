import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api, mensagemDeErro } from '../../api/cliente'
import { ROTULO_LGPD, ROTULO_PAPEL, type SolicitacaoLgpdAdmin } from '../../api/tipos'
import { CabecalhoPagina } from '../../componentes/CabecalhoPagina'
import { AlertBanner, Button, Card, DataTable, Dialog, StatusBadge, TextArea, TextField } from '../../design-system'
import { formatarDataHora } from '../../util/formato'
import './admin.css'

/** LGPD — atendimento das solicitações dos titulares (Administrador). */
export function Lgpd() {
  const cliente = useQueryClient()
  const consulta = useQuery({ queryKey: ['lgpd'], queryFn: () => api<SolicitacaoLgpdAdmin[]>('/lgpd/solicitacoes') })
  const [alvo, setAlvo] = useState<{ s: SolicitacaoLgpdAdmin; acao: 'concluir' | 'recusar' } | null>(null)
  const [resposta, setResposta] = useState('')
  const atender = useMutation({
    mutationFn: () => api(`/lgpd/solicitacoes/${alvo!.s.id}/${alvo!.acao}`, { method: 'POST', body: { resposta } }),
    onSuccess: () => {
      setAlvo(null)
      setResposta('')
      void cliente.invalidateQueries({ queryKey: ['lgpd'] })
    },
  })

  return (
    <>
      <CabecalhoPagina titulo="LGPD" descricao="Pedidos de exclusão e de correção de dados pessoais. Prazo legal de resposta: 15 dias." />
      {consulta.error && <AlertBanner tipo="erro">{mensagemDeErro(consulta.error)}</AlertBanner>}
      <div className="qz-pilha">
        <Card>
          <h2>Solicitações dos titulares</h2>
          <DataTable
            rotulo="Solicitações"
            carregando={consulta.isPending}
            linhas={consulta.data ?? []}
            chaveLinha={(s) => s.id}
            vazio="Nenhuma solicitação."
            colunas={[
              {
                chave: 't',
                titulo: 'Titular',
                render: (s) => (
                  <>
                    <strong>{s.titularNome}</strong>
                    <span className="qz-tabela__sub">
                      {s.titularEmail} · {ROTULO_PAPEL[s.titularPapel]}
                    </span>
                  </>
                ),
              },
              {
                chave: 'tipo',
                titulo: 'Pedido',
                render: (s) =>
                  s.tipo === 'CORRECAO' ? (
                    <>
                      Correção
                      <div className="qz-tabela__sub">
                        {Object.entries(s.dadosCorrigidos ?? {})
                          .map(([k, v]) => `${k === 'nome' ? 'Nome' : 'Matrícula'} → ${v}`)
                          .join(' · ')}
                      </div>
                    </>
                  ) : (
                    'Exclusão'
                  ),
              },
              { chave: 'm', titulo: 'Motivo', render: (s) => s.justificativa ?? '—' },
              { chave: 'c', titulo: 'Pedido em', render: (s) => formatarDataHora(s.criadoEm) },
              {
                chave: 'p',
                titulo: 'Prazo',
                render: (s) =>
                  s.status === 'PENDENTE' ? (
                    <StatusBadge status="P" tom={new Date(s.prazoResposta) < new Date() ? 'erro' : 'neutro'} rotulo={formatarDataHora(s.prazoResposta)} />
                  ) : (
                    '—'
                  ),
              },
              { chave: 's', titulo: 'Situação', render: (s) => <StatusBadge status={s.status} rotulo={ROTULO_LGPD[s.status]} /> },
              {
                chave: 'a',
                titulo: '',
                render: (s) =>
                  s.status === 'PENDENTE' ? (
                    <div className="qz-acoes qz-adm-nowrap">
                      <Button onClick={() => setAlvo({ s, acao: 'concluir' })}>{s.tipo === 'CORRECAO' ? 'Aplicar correção' : 'Anonimizar'}</Button>
                      <Button variante="fantasma" onClick={() => setAlvo({ s, acao: 'recusar' })}>
                        Recusar
                      </Button>
                    </div>
                  ) : (
                    <span className="qz-suave qz-pequeno">{s.resposta}</span>
                  ),
              },
            ]}
          />
        </Card>
        <div className="qz-adm-grade">
          <ExternoPorEmail />
          <Retencao />
        </div>
      </div>

      <Dialog
        aberto={!!alvo}
        titulo={
          alvo?.acao === 'concluir'
            ? alvo.s.tipo === 'CORRECAO'
              ? `Corrigir dados de ${alvo.s.titularNome}?`
              : `Anonimizar ${alvo.s.titularNome}?`
            : 'Recusar solicitação'
        }
        aoFechar={() => setAlvo(null)}
        acoes={
          <>
            <Button variante="secundario" onClick={() => setAlvo(null)}>
              Cancelar
            </Button>
            <Button carregando={atender.isPending} disabled={alvo?.acao === 'recusar' && !resposta.trim()} onClick={() => atender.mutate()}>
              {alvo?.acao === 'concluir' ? (alvo.s.tipo === 'CORRECAO' ? 'Aplicar correção' : 'Anonimizar definitivamente') : 'Recusar'}
            </Button>
          </>
        }
      >
        {atender.error && <AlertBanner tipo="erro">{mensagemDeErro(atender.error)}</AlertBanner>}
        {alvo?.acao === 'concluir' && alvo.s.tipo === 'CORRECAO' ? (
          <p>Os dados serão atualizados na conta e nos resultados guardados (o nome nas notas).</p>
        ) : alvo?.acao === 'concluir' ? (
          <AlertBanner tipo="alerta" titulo="Ação irreversível">
            Nome, e-mail, matrícula, senha e MFA serão removidos e a conta encerrada. Notas e tentativas permanecem, anônimas.
          </AlertBanner>
        ) : (
          <p>Explique ao titular o fundamento da recusa (ex.: obrigação legal de guarda).</p>
        )}
        <TextArea
          rotulo={alvo?.acao === 'recusar' ? 'Resposta ao titular (obrigatória)' : 'Resposta ao titular (opcional)'}
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
        />
      </Dialog>
    </>
  )
}

function ExternoPorEmail() {
  const [email, setEmail] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const anonimizar = useMutation({
    mutationFn: () => api<{ notas: number; instancias: number }>('/lgpd/externos/anonimizar', { method: 'POST', body: { email, justificativa } }),
    onSuccess: () => {
      setEmail('')
      setJustificativa('')
    },
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    anonimizar.mutate()
  }
  return (
    <Card>
      <h2>Participante externo (prova pública)</h2>
      <p className="qz-adm-nota">Quem fez prova pública não tem conta. Se o pedido chegar por outro canal (e-mail), anonimize pelo e-mail informado.</p>
      {anonimizar.error && <AlertBanner tipo="erro">{mensagemDeErro(anonimizar.error)}</AlertBanner>}
      {anonimizar.data && (
        <AlertBanner tipo="sucesso">
          Anonimizado: {anonimizar.data.notas} resultado(s) e {anonimizar.data.instancias} participação(ões).
        </AlertBanner>
      )}
      <form onSubmit={enviar}>
        <div className="qz-grade-campos">
          <TextField rotulo="E-mail do participante" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField rotulo="Justificativa (como o pedido chegou)" required value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
        </div>
        <Button type="submit" carregando={anonimizar.isPending} disabled={!email || !justificativa}>
          Anonimizar
        </Button>
      </form>
    </Card>
  )
}

/** Retenção dos dados de participantes externos (lote 8): configurada no servidor (RETENCAO_EXTERNOS_DIAS). */
function Retencao() {
  const aplicar = useMutation({
    mutationFn: () => api<{ ligada: boolean; dias: number; notas: number; instancias: number }>('/lgpd/retencao/aplicar', { method: 'POST' }),
  })
  return (
    <Card>
      <h2>Retenção de dados de participantes externos</h2>
      <p className="qz-adm-nota">
        Quando a instituição define um prazo (<code className="qz-codigo">RETENCAO_EXTERNOS_DIAS</code>), nome e e-mail de quem fez
        prova pública são anonimizados automaticamente depois dele (uma vez por dia). As notas permanecem para estatística.
      </p>
      {aplicar.error && <AlertBanner tipo="erro">{mensagemDeErro(aplicar.error)}</AlertBanner>}
      {aplicar.data &&
        (aplicar.data.ligada ? (
          <AlertBanner tipo="sucesso">
            Prazo de {aplicar.data.dias} dias: {aplicar.data.notas} resultado(s) e {aplicar.data.instancias} participação(ões) anonimizados.
          </AlertBanner>
        ) : (
          <AlertBanner tipo="info">Retenção desligada (nenhum prazo configurado no servidor).</AlertBanner>
        ))}
      <Button variante="secundario" carregando={aplicar.isPending} onClick={() => aplicar.mutate()}>
        Aplicar agora
      </Button>
    </Card>
  )
}
