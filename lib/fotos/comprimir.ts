import imageCompression from "browser-image-compression";

/** Limites iguais aos do servidor (lib/fotos/processar.ts). */
const TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024;

export class ErroFoto extends Error {}

/**
 * Comprime a foto no navegador antes de enviar: JPEG, lado maior de 1600 px, ~250 KB.
 * (Foto de celular tem 3 a 8 MB; sem isto o envio em 4G seria lento e o disco encheria.)
 */
export async function comprimirFoto(arquivo: File): Promise<Blob> {
  if (!arquivo.type.startsWith("image/")) throw new ErroFoto("Este arquivo não é uma imagem.");
  try {
    return await imageCompression(arquivo, {
      maxSizeMB: 0.25,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.8,
    });
  } catch {
    // Se a compressão falhar mas o arquivo já for pequeno, envia como está.
    if (arquivo.size <= TAMANHO_MAXIMO_BYTES) return arquivo;
    throw new ErroFoto("Não foi possível preparar esta foto. Tente tirar outra.");
  }
}
