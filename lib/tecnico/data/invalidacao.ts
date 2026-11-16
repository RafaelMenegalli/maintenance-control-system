/**
 * Aviso global "os dados mudaram": toda escrita bem-sucedida chama `notificarMudanca()`
 * e todos os hooks de leitura recarregam. (Na etapa 5, com o Dexie, o `useLiveQuery`
 * faz isso sozinho e este arquivo deixa de ser necessário.)
 */
let versao = 0;
const ouvintes = new Set<() => void>();

export function notificarMudanca() {
  versao += 1;
  ouvintes.forEach((o) => o());
}

export function assinarMudancas(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function versaoAtual() {
  return versao;
}
