const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Extrai o id do equipamento do texto lido no QR Code das etiquetas.
 * Aceita o endereço completo (`https://dominio/e/{id}`, de qualquer domínio — o QR pode ter sido impresso
 * antes de mudar o domínio), o caminho (`/e/{id}`) ou o id puro. Qualquer outra coisa devolve `null`.
 */
export function extrairIdDoQr(texto: string): string | null {
  const t = texto.trim();
  if (new RegExp(`^${UUID}$`, "i").test(t)) return t.toLowerCase();
  const m = new RegExp(`(?:^|/)e/(${UUID})(?:[/?#].*)?$`, "i").exec(t);
  return m ? m[1].toLowerCase() : null;
}
