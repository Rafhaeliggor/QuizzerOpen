export function linkProva(p: { id: string; status: string }) {
  return p.status === 'RASCUNHO' ? `/app/provas/${p.id}/editar` : `/app/provas/${p.id}`
}
