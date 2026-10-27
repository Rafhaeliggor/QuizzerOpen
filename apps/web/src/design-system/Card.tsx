import type { HTMLAttributes } from 'react'

export function Card({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={['qz-cartao', className].filter(Boolean).join(' ')} {...resto} />
}
