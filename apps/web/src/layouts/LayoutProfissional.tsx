import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import type { Papel } from '../api/tipos'
import { useAuth } from '../auth/contexto'
import { useDesvioAceite } from '../auth/DesvioAceite'
import { SinoNotificacoes } from '../componentes/SinoNotificacoes'
import { Icone } from '../design-system'
import { ANO_LETIVO, ContextoTituloPagina, NOME_INSTITUICAO, URL_AJUDA } from './identidade'
import { Marca } from './Marca'
import { MenuUsuario } from './MenuUsuario'
import './layouts.css'

interface ItemMenu {
  rotulo: string
  para: string
  papeis?: Papel[]
  /** Permissão delegada que também mostra o item (RF02). */
  permissao?: string
}

/** Menu do ambiente profissional, por papel (menor privilégio também na navegação). */
const AUTORIA: Papel[] = ['ADMINISTRADOR', 'COORDENADOR', 'PROFESSOR']
const CORRECAO: Papel[] = [...AUTORIA, 'CORRETOR']

const MENU: ItemMenu[] = [
  { rotulo: 'Dashboard', para: '/app' },
  { rotulo: 'Banco de Questões', para: '/app/questoes', papeis: AUTORIA },
  { rotulo: 'Provas', para: '/app/provas', papeis: AUTORIA },
  { rotulo: 'Turmas', para: '/app/turmas', papeis: AUTORIA },
  { rotulo: 'Aplicações', para: '/app/aplicacoes', papeis: AUTORIA },
  { rotulo: 'Correções', para: '/app/correcoes', papeis: CORRECAO },
  { rotulo: 'Recursos', para: '/app/recursos', papeis: AUTORIA },
  { rotulo: 'Relatórios', para: '/app/relatorios', papeis: AUTORIA },
  { rotulo: 'Usuários', para: '/app/usuarios', papeis: ['ADMINISTRADOR', 'COORDENADOR'], permissao: 'DESBLOQUEAR_CONTAS' },
  { rotulo: 'Auditoria', para: '/app/auditoria', papeis: ['ADMINISTRADOR'], permissao: 'CONSULTAR_AUDITORIA' },
  { rotulo: 'LGPD', para: '/app/lgpd', papeis: ['ADMINISTRADOR'] },
  { rotulo: 'Integrações', para: '/app/integracoes', papeis: ['ADMINISTRADOR'] },
  { rotulo: 'Configurações', para: '/app/conta' },
]

export function LayoutProfissional() {
  const { usuario } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const [tituloPagina, setTituloPagina] = useState<string | null>(null)
  const local = useLocation()
  const [rotaAnterior, setRotaAnterior] = useState(local.pathname)
  if (rotaAnterior !== local.pathname) {
    // Fecha o menu lateral (mobile) ao navegar.
    setRotaAnterior(local.pathname)
    setMenuAberto(false)
  }
  const desvio = useDesvioAceite()
  if (desvio) return desvio

  const visiveis = MENU.filter(
    (i) =>
      !i.papeis ||
      (usuario && (i.papeis.includes(usuario.papel) || (!!i.permissao && !!usuario.permissoes?.includes(i.permissao)))),
  )
  // Trilha: instituição / seção (link quando há subpágina) / título da subpágina.
  const secao = [...visiveis].reverse().find((i) => (i.para === '/app' ? local.pathname === '/app' : local.pathname.startsWith(i.para)))
  const emSubpagina = !!secao && local.pathname !== secao.para

  return (
    <div className="qz-app">
      <aside className={`qz-sidebar${menuAberto ? ' qz-sidebar--aberta' : ''}`}>
        <Marca para="/app" />
        <div className="qz-sidebar__ambiente">Ambiente profissional</div>
        <div className="qz-instituicao">
          <Icone nome="instituicao" tamanho={18} />
          <div>
            <strong>{NOME_INSTITUICAO}</strong>
            <span>Ano letivo {ANO_LETIVO}</span>
          </div>
        </div>
        <nav className="qz-sidebar__menu" aria-label="Menu principal">
          {visiveis.map((i) => (
            <NavLink key={i.para} to={i.para} end={i.para === '/app'}>
              {i.rotulo}
            </NavLink>
          ))}
        </nav>
        {URL_AJUDA && (
          <div className="qz-ajuda">
            <strong>Precisa de uma mão?</strong>
            <a href={URL_AJUDA} target="_blank" rel="noreferrer">
              Central de ajuda <Icone nome="seta-externa" tamanho={12} />
            </a>
          </div>
        )}
      </aside>
      {menuAberto && <div className="qz-sidebar__fundo" onClick={() => setMenuAberto(false)} aria-hidden />}
      <div className="qz-principal">
        <header className="qz-topo">
          <button
            type="button"
            className="qz-botao qz-botao--fantasma qz-botao--icone qz-topo__menu"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((v) => !v)}
          >
            <Icone nome="menu" />
          </button>
          <nav className="qz-trilha" aria-label="Você está em">
            <span>{NOME_INSTITUICAO}</span>
            {secao && (
              <>
                <span aria-hidden>/</span>
                {emSubpagina ? <Link to={secao.para}>{secao.rotulo}</Link> : <span aria-current="page">{secao.rotulo}</span>}
              </>
            )}
            {emSubpagina && tituloPagina && (
              <>
                <span aria-hidden>/</span>
                <span aria-current="page">{tituloPagina}</span>
              </>
            )}
          </nav>
          <span className="qz-topo__espaco" />
          <SinoNotificacoes />
          <MenuUsuario />
        </header>
        <main className="qz-conteudo">
          <ContextoTituloPagina.Provider value={setTituloPagina}>
            <Suspense fallback={<p className="qz-suave" role="status">Carregando…</p>}>
              <Outlet />
            </Suspense>
          </ContextoTituloPagina.Provider>
        </main>
      </div>
    </div>
  )
}
