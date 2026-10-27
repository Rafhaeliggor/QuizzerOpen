import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { api, mensagemDeErro } from '../../api/cliente'
import type { Ambiente } from '../../api/tipos'
import { rotaLogin } from '../../auth/contexto'
import { AlertBanner, Button, TextField } from '../../design-system'
import { LayoutAuth } from '../../layouts/LayoutAuth'
import { useRecursos } from '../../api/recursos'

/** "Esqueci minha senha" — envia link por e-mail (ADR-0041). */
export function EsqueciSenha({ ambiente }: { ambiente: Ambiente }) {
  const [email, setEmail] = useState('')
  const recursos = useRecursos()
  const pedir = useMutation({
    mutationFn: () =>
      api<{ mensagem: string }>('/auth/senha/esqueci', { method: 'POST', body: { email }, semRenovacao: true }),
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    pedir.mutate()
  }
  return (
    <LayoutAuth titulo="Esqueci minha senha" rodape={<Link to={rotaLogin(ambiente)}>Voltar ao login</Link>}>
      {recursos.data && !recursos.data.emailHabilitado ? (
        <AlertBanner tipo="info">
          O envio de e-mail não está configurado nesta instalação. Peça à secretaria/coordenação para redefinir a sua senha.
        </AlertBanner>
      ) : pedir.isSuccess ? (
        <AlertBanner tipo="sucesso">{pedir.data.mensagem} Confira também a caixa de spam. O link vale por 30 minutos.</AlertBanner>
      ) : (
        <form onSubmit={enviar} noValidate>
          {pedir.error && <AlertBanner tipo="erro">{mensagemDeErro(pedir.error)}</AlertBanner>}
          <p className="qz-suave">Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.</p>
          <TextField rotulo="E-mail" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" largo carregando={pedir.isPending} disabled={!email.includes('@')}>
            Enviar link
          </Button>
        </form>
      )}
    </LayoutAuth>
  )
}

/** Página do link do e-mail: define a nova senha (redefinição ou convite de primeiro acesso). */
export function RedefinirSenha({ ambiente }: { ambiente: Ambiente }) {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const redefinir = useMutation({
    mutationFn: () =>
      api<{ mensagem: string }>('/auth/senha/redefinir', { method: 'POST', body: { token, novaSenha: senha }, semRenovacao: true }),
  })
  const politicaOk = senha.length >= 10 && /[A-Za-z]/.test(senha) && /\d/.test(senha)
  function enviar(e: FormEvent) {
    e.preventDefault()
    redefinir.mutate()
  }
  return (
    <LayoutAuth titulo="Definir nova senha" rodape={<Link to={rotaLogin(ambiente)}>Ir para o login</Link>}>
      {!token ? (
        <AlertBanner tipo="erro">Link incompleto. Abra o link do e-mail novamente.</AlertBanner>
      ) : redefinir.isSuccess ? (
        <AlertBanner tipo="sucesso">
          {redefinir.data.mensagem} <Link to={rotaLogin(ambiente)}>Entrar</Link>
        </AlertBanner>
      ) : (
        <form onSubmit={enviar} noValidate>
          {redefinir.error && <AlertBanner tipo="erro">{mensagemDeErro(redefinir.error)}</AlertBanner>}
          <TextField
            rotulo="Nova senha"
            type="password"
            autoComplete="new-password"
            required
            autoFocus
            ajuda="Mínimo de 10 caracteres, com letras e números."
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <TextField
            rotulo="Repita a nova senha"
            type="password"
            autoComplete="new-password"
            required
            erro={confirma && confirma !== senha ? 'As senhas não conferem' : undefined}
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
          />
          <Button type="submit" largo carregando={redefinir.isPending} disabled={!politicaOk || senha !== confirma}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </LayoutAuth>
  )
}
