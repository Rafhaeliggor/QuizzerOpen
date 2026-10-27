import { Link } from 'react-router'
import { Icone, type NomeIcone } from '../../design-system'
import { Marca } from '../../layouts/Marca'
import '../../layouts/layouts.css'
import './homepage.css'

interface Item {
  icone: NomeIcone
  titulo: string
  texto: string
}

const RECURSOS: Item[] = [
  {
    icone: 'biblioteca',
    titulo: 'Banco de questões',
    texto: 'Múltipla escolha, V/F, resposta curta, numérica, dissertativa, associação e ordenação, com fórmulas, mídias e histórico de versões.',
  },
  {
    icone: 'documentos',
    titulo: 'Montagem de provas',
    texto: 'Seções, sorteio de questões, versões embaralhadas, nota mínima por seção e impressão em PDF.',
  },
  {
    icone: 'relogio',
    titulo: 'Aplicação online',
    texto: 'Cronômetro, salvamento automático, acesso por turma ou por PIN e comprovante de envio para o aluno.',
  },
  {
    icone: 'check-duplo',
    titulo: 'Correção',
    texto: 'Correção automática das objetivas e fila para as dissertativas, com rubrica, corretores designados e correção às cegas.',
  },
  {
    icone: 'mensagem',
    titulo: 'Recursos',
    texto: 'O aluno contesta a correção dentro do prazo, e o professor responde e ajusta a nota sem sair da plataforma.',
  },
  {
    icone: 'grafico',
    titulo: 'Relatórios',
    texto: 'Desempenho por prova, turma, aluno e questão, com exportação em CSV e Excel.',
  },
]

const PASSOS = [
  { titulo: 'Cadastre as questões', texto: 'Monte o banco da sua disciplina ou reaproveite o da equipe.' },
  { titulo: 'Monte a prova', texto: 'Escolha as questões, defina tempo, pesos e regras de gabarito.' },
  { titulo: 'Aplique', texto: 'Libere para uma turma ou compartilhe um PIN. Acompanhe ao vivo.' },
  { titulo: 'Corrija e analise', texto: 'Publique as notas, responda recursos e veja os relatórios.' },
]

const SEGURANCA: Item[] = [
  { icone: 'escudo', titulo: 'Verificação em duas etapas', texto: 'Obrigatória para administradores e exigível por prova.' },
  { icone: 'olho', titulo: 'Auditoria', texto: 'Ações sensíveis ficam registradas, com exportação.' },
  { icone: 'usuarios', titulo: 'LGPD', texto: 'Cada pessoa consulta, corrige e pede a exclusão dos seus dados.' },
  { icone: 'download', titulo: 'Backup', texto: 'Cópias criptografadas e testes periódicos de restauração.' },
]

/** Página pública de apresentação, exibida em "/" para quem não está logado. */
export function Homepage() {
  return (
    <div className="qz-home">
      <header className="qz-home__topo">
        <div className="qz-home__conteudo qz-home__topo-linha">
          <Marca para="/" />
          <nav className="qz-home__nav" aria-label="Acesso">
            <Link to="/p">Tenho um PIN</Link>
            <Link to="/aluno/login">Área do aluno</Link>
            <Link to="/login" className="qz-botao qz-botao--primario">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="qz-home__conteudo qz-home__hero">
          <div>
            <span className="qz-home__selo">Avaliações online</span>
            <h1>Do banco de questões ao resultado, em um só lugar.</h1>
            <p className="qz-home__lead">
              O Quizzer ajuda escolas e professores a criar, aplicar e corrigir provas com segurança, e dá ao aluno uma
              experiência clara do início ao comprovante.
            </p>
            <div className="qz-home__acoes">
              <Link to="/login" className="qz-botao qz-botao--primario">
                Entrar como professor
                <Icone nome="seta-direita" />
              </Link>
              <Link to="/aluno/login" className="qz-botao qz-botao--secundario">
                Sou aluno
              </Link>
            </div>
            <p className="qz-home__pin">
              Recebeu um código de prova? <Link to="/p">Entre com o PIN</Link>, sem precisar de conta.
            </p>
          </div>

          <MiniProva />
        </section>

        <section className="qz-home__secao" aria-labelledby="home-recursos">
          <div className="qz-home__conteudo">
            <h2 id="home-recursos">Tudo o que uma avaliação precisa</h2>
            <p className="qz-home__subtitulo">Cada etapa da prova tem sua ferramenta, e todas conversam entre si.</p>
            <ul className="qz-home__grade">
              {RECURSOS.map((r) => (
                <li key={r.titulo} className="qz-home__cartao">
                  <span className="qz-home__icone">
                    <Icone nome={r.icone} tamanho={20} />
                  </span>
                  <h3>{r.titulo}</h3>
                  <p>{r.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="qz-home__secao qz-home__secao--alternada" aria-labelledby="home-passos">
          <div className="qz-home__conteudo">
            <h2 id="home-passos">Como funciona</h2>
            <ol className="qz-home__passos">
              {PASSOS.map((p, i) => (
                <li key={p.titulo}>
                  <span className="qz-home__numero" aria-hidden>
                    {i + 1}
                  </span>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="qz-home__secao" aria-labelledby="home-perfis">
          <div className="qz-home__conteudo">
            <h2 id="home-perfis">Feito para cada perfil</h2>
            <div className="qz-home__perfis">
              <div className="qz-home__cartao">
                <span className="qz-home__icone">
                  <Icone nome="caderno" tamanho={20} />
                </span>
                <h3>Professores e coordenadores</h3>
                <ul className="qz-home__lista">
                  <li>Banco de questões compartilhado com revisão</li>
                  <li>Co-professores e delegação de permissões</li>
                  <li>Acompanhamento da aplicação em tempo real</li>
                </ul>
                <Link to="/login">Entrar no ambiente profissional</Link>
              </div>
              <div className="qz-home__cartao">
                <span className="qz-home__icone">
                  <Icone nome="formatura" tamanho={20} />
                </span>
                <h3>Alunos</h3>
                <ul className="qz-home__lista">
                  <li>Provas disponíveis e prazos no painel</li>
                  <li>Respostas salvas automaticamente</li>
                  <li>Notas, gabarito e recursos no mesmo lugar</li>
                </ul>
                <Link to="/aluno/login">Entrar na área do aluno</Link>
              </div>
              <div className="qz-home__cartao">
                <span className="qz-home__icone">
                  <Icone nome="instituicao" tamanho={20} />
                </span>
                <h3>Administração</h3>
                <ul className="qz-home__lista">
                  <li>Usuários, papéis e turmas</li>
                  <li>Importação por CSV e API de integração</li>
                  <li>Auditoria e pedidos de LGPD</li>
                </ul>
                <Link to="/login">Entrar como administrador</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="qz-home__secao qz-home__secao--alternada" aria-labelledby="home-seguranca">
          <div className="qz-home__conteudo">
            <h2 id="home-seguranca">Segurança e privacidade</h2>
            <ul className="qz-home__seguranca">
              {SEGURANCA.map((s) => (
                <li key={s.titulo}>
                  <Icone nome={s.icone} tamanho={20} />
                  <div>
                    <strong>{s.titulo}</strong>
                    <p>{s.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="qz-home__conteudo qz-home__chamada">
          <h2>Pronto para começar?</h2>
          <div className="qz-home__acoes">
            <Link to="/login" className="qz-botao qz-botao--primario">
              Entrar como professor
            </Link>
            <Link to="/aluno/login" className="qz-botao qz-botao--secundario">
              Sou aluno
            </Link>
            <Link to="/p" className="qz-botao qz-botao--fantasma">
              Tenho um PIN
            </Link>
          </div>
        </section>
      </main>

      <footer className="qz-home__rodape">
        <div className="qz-home__conteudo qz-home__topo-linha">
          <span>Quizzer · avaliações online</span>
          <nav aria-label="Documentos">
            <Link to="/termos">Termos de Uso</Link> · <Link to="/privacidade">Política de Privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/** Ilustração do hero: uma questão como o aluno a vê, feita só com CSS (CSP sem imagens externas). */
function MiniProva() {
  return (
    <div className="qz-home__mini" aria-hidden>
      <div className="qz-home__mini-topo">
        <span>Matemática · Questão 3 de 10</span>
        <span className="qz-home__mini-timer">
          <Icone nome="relogio" tamanho={14} /> 24:18
        </span>
      </div>
      <div className="qz-home__mini-barra">
        <span />
      </div>
      <p className="qz-home__mini-enunciado">Qual é o valor de x na equação 2x + 6 = 14?</p>
      <ul className="qz-home__mini-opcoes">
        {['2', '4', '6', '8'].map((v, i) => (
          <li key={v} className={i === 1 ? 'is-marcada' : undefined}>
            <span>{String.fromCharCode(65 + i)}</span>
            {v}
          </li>
        ))}
      </ul>
      <div className="qz-home__mini-rodape">
        <span className="qz-home__mini-salvo">
          <Icone nome="check-circulo" tamanho={14} /> Resposta salva
        </span>
        <span className="qz-botao qz-botao--primario">Próxima</span>
      </div>
    </div>
  )
}
