/**
 * Gera uma `key` estável a partir de um rótulo ("Nº de série" → "n_de_serie").
 * A key nunca muda depois de criada (o histórico e os valores dependem dela).
 */
export function gerarKey(rotulo: string, existentes: Iterable<string> = []): string {
  const usadas = new Set(existentes);
  let base = rotulo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (!base) base = "campo";
  if (!/^[a-z]/.test(base)) base = `campo_${base}`;

  let key = base;
  let n = 2;
  while (usadas.has(key)) key = `${base}_${n++}`;
  return key;
}
