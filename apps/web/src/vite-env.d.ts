/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Nome da instituição exibido no menu lateral e na trilha de navegação. */
  readonly VITE_NOME_INSTITUICAO?: string
  /** Endereço da central de ajuda; vazio oculta o cartão "Precisa de uma mão?". */
  readonly VITE_URL_AJUDA?: string
  /** Contato do encarregado de dados (DPO) nos Termos de Uso e na Política de Privacidade. */
  readonly VITE_CONTATO_ENCARREGADO?: string
}
