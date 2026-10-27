import { useRef, useState } from 'react'
import { api, mensagemDeErro } from '../api/cliente'
import type { Midia } from '../api/tipos'
import { AlertBanner, Button } from '../design-system'

/** Exibe as mídias de uma questão (imagens e áudios). */
export function ListaMidias({ midias }: { midias?: Midia[] }) {
  if (!midias?.length) return null
  return (
    <div className="qz-midias">
      {midias.map((m) =>
        m.tipo === 'AUDIO' ? (
          <audio key={m.id} controls preload="none" src={m.url} aria-label={`Áudio: ${m.nomeOriginal}`} />
        ) : (
          <img key={m.id} src={m.url} alt={`Imagem da questão: ${m.nomeOriginal}`} loading="lazy" />
        ),
      )}
    </div>
  )
}

const ACEITOS = 'image/png,image/jpeg,image/gif,image/webp,audio/mpeg,audio/ogg,audio/wav'

/** Envio de mídias no editor de questões (até 10, 5 MB cada). */
export function EditorMidias({ midias, aoAlterar }: { midias: Midia[]; aoAlterar: (m: Midia[]) => void }) {
  const entrada = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return
    setErro(null)
    setEnviando(true)
    const novas: Midia[] = []
    try {
      for (const arquivo of Array.from(arquivos).slice(0, 10 - midias.length)) {
        if (arquivo.size > 5 * 1024 * 1024) throw new Error(`"${arquivo.name}" tem mais de 5 MB`)
        const formulario = new FormData()
        formulario.append('arquivo', arquivo)
        novas.push(await api<Midia>('/midias', { method: 'POST', formulario }))
      }
    } catch (e) {
      setErro(e instanceof Error && !('status' in e) ? e.message : mensagemDeErro(e))
    } finally {
      setEnviando(false)
      if (entrada.current) entrada.current.value = ''
      if (novas.length) aoAlterar([...midias, ...novas])
    }
  }

  return (
    <fieldset className="qz-fieldset">
      <legend>Imagens e áudios (opcional)</legend>
      {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}
      {midias.map((m) => (
        <div key={m.id} className="qz-linha">
          {m.tipo === 'AUDIO' ? (
            <audio controls preload="none" src={m.url} />
          ) : (
            <img src={m.url} alt="" className="qz-midia-miniatura" />
          )}
          <span className="qz-suave qz-pequeno">{m.nomeOriginal}</span>
          <Button variante="fantasma" onClick={() => aoAlterar(midias.filter((x) => x.id !== m.id))} aria-label={`Remover ${m.nomeOriginal}`}>
            ✕
          </Button>
        </div>
      ))}
      <input
        ref={entrada}
        type="file"
        accept={ACEITOS}
        multiple
        hidden
        aria-label="Escolher imagens ou áudios"
        onChange={(e) => void enviar(e.target.files)}
      />
      <Button variante="secundario" carregando={enviando} disabled={midias.length >= 10} onClick={() => entrada.current?.click()}>
        Adicionar imagem ou áudio
      </Button>
      <p className="qz-suave qz-pequeno">PNG, JPEG, GIF, WebP, MP3, OGG ou WAV · até 5 MB cada · SVG não é aceito.</p>
    </fieldset>
  )
}
