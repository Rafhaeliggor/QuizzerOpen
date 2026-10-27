import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { rotaInicial, useAuth } from '../../auth/contexto'
import { AlertBanner, Button, Spinner, TextField } from '../../design-system'
import { LayoutAuth } from '../../layouts/LayoutAuth'
import { mensagemDeErro } from '../../api/cliente'

/** Mesma política do backend: 10–128 caracteres com letras e números. */
const POLITICA = /^(?=.*[A-Za-z])(?=.*\d).{10,128}$/

/** RF02, passo 4: troca obrigatória de senha no primeiro acesso. */
export function TrocarSenha() {
  const { estado, usuario, trocarSenha, sair } = useAuth()
  const navegar = useNavigate()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (estado === 'carregando') return <Spinner telaCheia />
  if (!usuario) return <Navigate to="/login" replace />

  const erroNova = nova && !POLITICA.test(nova) ? 'Use ao menos 10 caracteres, com letras e números.' : undefined
  const erroConfirmacao = confirmacao && confirmacao !== nova ? 'As senhas não conferem.' : undefined

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!usuario) return
    setErro(null)
    setEnviando(true)
    try {
      await trocarSenha(atual, nova)
      navegar(rotaInicial(usuario.ambiente), { replace: true })
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <LayoutAuth
      titulo="Defina uma nova senha"
      subtitulo={usuario.trocarSenha ? 'Por segurança, troque a senha temporária antes de continuar.' : undefined}
      rodape={
        <Button variante="fantasma" onClick={() => void sair()}>
          Sair
        </Button>
      }
    >
      <form onSubmit={enviar} noValidate>
        {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}
        <TextField rotulo="Senha atual" type="password" autoComplete="current-password" required value={atual} onChange={(e) => setAtual(e.target.value)} />
        <TextField
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          ajuda="Mínimo de 10 caracteres, com letras e números."
          erro={erroNova}
          value={nova}
          onChange={(e) => setNova(e.target.value)}
        />
        <TextField
          rotulo="Confirme a nova senha"
          type="password"
          autoComplete="new-password"
          required
          erro={erroConfirmacao}
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        <Button type="submit" largo carregando={enviando} disabled={!atual || !nova || !!erroNova || nova !== confirmacao}>
          Salvar nova senha
        </Button>
      </form>
    </LayoutAuth>
  )
}
