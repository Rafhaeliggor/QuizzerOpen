import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { ErroApi } from './api/cliente'
import { ProvedorAuth } from './auth/ProvedorAuth'
import '@fontsource-variable/inter'
import './index.css'
import { roteador } from './rotas'

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Não repete erros de cliente (401/403/404…), só falhas de rede/servidor.
      retry: (falhas, erro) => !(erro instanceof ErroApi && erro.status < 500) && falhas < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteQuery}>
      <ProvedorAuth>
        {/* Telas carregadas sob demanda fora dos layouts (ex.: impressão) */}
        <Suspense fallback={<p role="status">Carregando…</p>}>
          <RouterProvider router={roteador} />
        </Suspense>
      </ProvedorAuth>
    </QueryClientProvider>
  </StrictMode>,
)
