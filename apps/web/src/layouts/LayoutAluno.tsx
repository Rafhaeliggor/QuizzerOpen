import { NavLink, Outlet } from 'react-router'
import { useDesvioAceite } from '../auth/DesvioAceite'
import { SinoNotificacoes } from '../componentes/SinoNotificacoes'
import { Marca } from './Marca'
import { MenuUsuario } from './MenuUsuario'
import './layouts.css'

/** Ambiente do aluno: barra superior simples e conteúdo centralizado (a execução da prova fica em tela cheia). */
export function LayoutAluno() {
  const desvio = useDesvioAceite()
  if (desvio) return desvio
  return (
    <>
      <BarraAluno navegacao />
      <main className="qz-aluno">
        <Outlet />
      </main>
    </>
  )
}

/** Barra superior do aluno; sem `navegacao` na execução da prova (foco total). */
export function BarraAluno({ navegacao }: { navegacao?: boolean }) {
  return (
    <header className="qz-barra-aluno">
      <Marca para="/aluno" />
      {navegacao && (
        <nav className="qz-nav-aluno" aria-label="Seções do aluno">
          <NavLink to="/aluno" end>
            Minhas provas
          </NavLink>
          <NavLink to="/aluno/resultados">Resultados</NavLink>
          <NavLink to="/aluno/recursos">Contestações</NavLink>
        </nav>
      )}
      <div className="qz-barra-aluno__direita">
        <span className="qz-badge qz-badge--info">Ambiente do aluno</span>
        {navegacao && <SinoNotificacoes />}
        <MenuUsuario compacto />
      </div>
    </header>
  )
}
