import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { api, mensagemDeErro } from '../api/cliente'
import { rotaInicial, useAuth } from '../auth/contexto'
import { AlertBanner, Button, Card, Tabs } from '../design-system'
import { formatarVersao, POLITICA_DE_PRIVACIDADE, TERMOS_DE_USO, VERSAO_DOCUMENTOS_LEGAIS } from '../legal/documentos'
import '../legal/legal.css'
import { TextoLegal } from '../legal/TextoLegal'
import { Marca } from '../layouts/Marca'
import '../layouts/layouts.css'

/** Páginas públicas com o texto completo (rodapé do login, provas públicas e página de aceite). */
export function PaginaTermos() {
  return <PaginaDocumento doc={TERMOS_DE_USO} outro={POLITICA_DE_PRIVACIDADE} />
}

export function PaginaPrivacidade() {
  return <PaginaDocumento doc={POLITICA_DE_PRIVACIDADE} outro={TERMOS_DE_USO} />
}

function PaginaDocumento({ doc, outro }: { doc: typeof TERMOS_DE_USO; outro: typeof TERMOS_DE_USO }) {
  return (
    <div className="qz-legal-pagina">
      <div className="qz-legal-pagina__topo">
        <Marca para="/" />
        <Link to={outro.rota}>{outro.titulo}</Link>
      </div>
      <Card>
        <TextoLegal doc={doc} />
      </Card>
    </div>
  )
}

type Aba = 'termos' | 'privacidade'

/**
 * Aceite dos Termos de Uso e ciência da Política de Privacidade (ADR-0060): os layouts
 * desviam para cá enquanto a versão vigente não foi aceita. A execução da prova não passa
 * por aqui (fica fora dos layouts).
 */
export function AceiteTermos() {
  const { usuario, atualizarUsuario, sair } = useAuth()
  const destino = (useLocation().state as { de?: string } | null)?.de
  const [aba, setAba] = useState<Aba>('termos')
  const [termos, setTermos] = useState(false)
  const [privacidade, setPrivacidade] = useState(false)
  const aceitar = useMutation({
    mutationFn: () => api('/minha-conta/politica/aceitar', { method: 'POST', body: { versao: VERSAO_DOCUMENTOS_LEGAIS } }),
    // Com o usuário atualizado (politicaPendente: false), o Navigate abaixo devolve à página de origem.
    onSuccess: () => atualizarUsuario(),
  })
  if (!usuario) return null
  if (!usuario.politicaPendente) return <Navigate to={destino ?? rotaInicial(usuario.ambiente)} replace />
  const doc = aba === 'termos' ? TERMOS_DE_USO : POLITICA_DE_PRIVACIDADE

  return (
    <div className="qz-legal-pagina">
      <div className="qz-legal-pagina__topo">
        <Marca para="/" />
      </div>
      <Card>
        <h1>Termos de Uso e Política de Privacidade</h1>
        <p className="qz-suave">
          Olá, {usuario.nome.split(' ')[0]}. Antes de continuar, leia os dois documentos (versão de {formatarVersao()}).
        </p>
        <Tabs<Aba>
          rotulo="Documentos"
          ativa={aba}
          aoMudar={setAba}
          abas={[
            { valor: 'termos', rotulo: TERMOS_DE_USO.titulo },
            { valor: 'privacidade', rotulo: POLITICA_DE_PRIVACIDADE.titulo },
          ]}
        />
        {/* Área rolável focável pelo teclado */}
        <div className="qz-aceite__caixa" tabIndex={0} role="region" aria-label={`Texto: ${doc.titulo}`}>
          <TextoLegal doc={doc} nivel={2} />
        </div>
        {aceitar.error && <AlertBanner tipo="erro">{mensagemDeErro(aceitar.error)}</AlertBanner>}
        <fieldset className="qz-aceite__marcacoes">
          <legend className="qz-pequeno qz-suave">Para continuar, marque as duas opções:</legend>
          <label className="qz-aceite__marcacao">
            <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
            <span>
              Li e aceito os <strong>Termos de Uso</strong>.
            </span>
          </label>
          <label className="qz-aceite__marcacao">
            <input type="checkbox" checked={privacidade} onChange={(e) => setPrivacidade(e.target.checked)} />
            <span>
              Li a <strong>Política de Privacidade</strong> e estou ciente de como meus dados são tratados.
            </span>
          </label>
        </fieldset>
        <div className="qz-aceite__acoes">
          <Button variante="secundario" onClick={() => void sair()}>
            Sair sem aceitar
          </Button>
          <Button disabled={!termos || !privacidade} carregando={aceitar.isPending} onClick={() => aceitar.mutate()}>
            Aceitar e continuar
          </Button>
        </div>
      </Card>
    </div>
  )
}
