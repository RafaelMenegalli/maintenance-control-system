import sharp from "sharp";

/** Limites das fotos (escopo: compressão no navegador ~250 KB, lado maior 1600 px). */
export const TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024;
export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"] as const;
export const LADO_MAIOR_MAXIMO = 1600;
export const LADO_MINIATURA = 400;

/**
 * Valida de verdade que o arquivo é uma imagem (o `sharp` falha em qualquer outra coisa,
 * mesmo com extensão ou tipo falsos), corrige a rotação do celular (EXIF), limita o lado
 * maior e regrava como JPEG. Assim o que vai para o disco é sempre um JPEG limpo.
 */
export async function normalizarFoto(entrada: Buffer) {
  const { data, info } = await sharp(entrada, { failOn: "error" })
    .rotate()
    .resize({ width: LADO_MAIOR_MAXIMO, height: LADO_MAIOR_MAXIMO, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { jpeg: data, largura: info.width, altura: info.height };
}

/** Miniatura de ~400 px (lado maior). */
export function gerarMiniatura(jpeg: Buffer): Promise<Buffer> {
  return sharp(jpeg)
    .resize({ width: LADO_MINIATURA, height: LADO_MINIATURA, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();
}

/** Largura e altura de um JPEG já salvo. */
export async function dimensoes(jpeg: Buffer): Promise<{ largura: number | null; altura: number | null }> {
  const meta = await sharp(jpeg).metadata();
  return { largura: meta.width ?? null, altura: meta.height ?? null };
}
