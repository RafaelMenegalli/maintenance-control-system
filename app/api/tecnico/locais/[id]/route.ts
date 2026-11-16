import { ErroApi, idValido } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { excluirLocal } from "@/lib/tecnico/mutacoes";

export const dynamic = "force-dynamic";

/** Exclui o local — só se não tiver equipamentos. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return comAdminApi(async () => {
    if (!idValido(id)) throw new ErroApi("Local não encontrado.", 404);
    return excluirLocal(id);
  });
}
