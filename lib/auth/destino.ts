/**
 * Só aceita destinos internos ("/e/abc", "/tecnico/..."). Evita redirecionar para outro site
 * por um link malicioso com `?voltar=https://...`.
 */
export function destinoSeguro(valor: string | string[] | undefined | null): string | null {
  if (typeof valor !== "string") return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return null;
  return valor;
}
