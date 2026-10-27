/**
 * Executa `fn` para cada item com no máximo `limite` em andamento ao mesmo tempo, devolvendo os
 * resultados na ordem original. Usado em importações (hash Argon2 e convite por item).
 */
export async function emParalelo<T, R>(itens: T[], limite: number, fn: (item: T, indice: number) => Promise<R>): Promise<R[]> {
  const resultados: R[] = Array.from({ length: itens.length });
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await fn(itens[i]!, i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limite, itens.length)) }, trabalhador));
  return resultados;
}
