/** Espera inicial depois da primeira falha, e teto da espera. */
export const ESPERA_INICIAL_MS = 15_000;
export const ESPERA_MAXIMA_MS = 15 * 60_000;

/**
 * Espera crescente entre tentativas de envio: 15 s, 30 s, 1 min, 2 min… até 15 min.
 * `tentativas` é quantas vezes já falhou (1 = acabou de falhar a primeira vez).
 */
export function calcularEspera(tentativas: number): number {
  if (tentativas <= 0) return 0;
  return Math.min(ESPERA_INICIAL_MS * 2 ** (tentativas - 1), ESPERA_MAXIMA_MS);
}
