import { z } from "zod";
import { lerCorpo } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { servicoInputSchema } from "@/lib/schemas/entidades";
import { receberServicos } from "@/lib/tecnico/sync-servidor";
import { MAX_SERVICOS_POR_PUSH } from "@/lib/tecnico/sync/tipos";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({
  servicos: z.array(servicoInputSchema).min(1, "Nenhum serviço para enviar.").max(MAX_SERVICOS_POR_PUSH, "Lote grande demais."),
});

/**
 * Recebe o lote de serviços registrados offline. As fotos já subiram por POST /api/fotos (fotos primeiro,
 * serviço depois). IDEMPOTENTE por `id`: reenviar não duplica. Devolve o resultado de cada serviço;
 * o celular só tira da fila o que voltou com `ok: true`.
 */
export function POST(req: Request) {
  return comAdminApi(async (sessao) => {
    const { servicos } = await lerCorpo(req, corpoSchema);
    return { resultados: await receberServicos(servicos, sessao.user.id) };
  });
}
