import { gerarMiniatura } from "@/lib/fotos/processar";
import { armazenamento, chaveFoto, chaveMiniatura } from "@/lib/storage";

/**
 * Garante que a miniatura (~400 px) da foto exista no armazenamento — gera e guarda na primeira vez —
 * e devolve a chave dela. `null` se a foto original não existe.
 * Só chamar depois de conferir a permissão sobre a foto.
 */
export async function garantirMiniatura(servicoId: string, fotoId: string): Promise<string | null> {
  const chaveMini = chaveMiniatura(servicoId, fotoId);
  if (await armazenamento.existe(chaveMini)) return chaveMini;
  const original = await armazenamento.ler(chaveFoto(servicoId, fotoId));
  if (!original) return null;
  await armazenamento.salvar(chaveMini, await gerarMiniatura(original));
  return chaveMini;
}

/** Bytes da miniatura (para o PDF do relatório). `null` se a foto não existe mais no disco. */
export async function lerMiniatura(servicoId: string, fotoId: string): Promise<Buffer | null> {
  const chave = await garantirMiniatura(servicoId, fotoId);
  return chave ? armazenamento.ler(chave) : null;
}
