import { z } from "zod";
import { ErroApi, idValido, lerCorpo } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { arquivarEquipamento } from "@/lib/tecnico/mutacoes";
import { obterEquipamentoAdmin } from "@/lib/tecnico/queries";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

async function idOuErro(ctx: Contexto) {
  const { id } = await ctx.params;
  if (!idValido(id)) throw new ErroApi("Equipamento não encontrado.", 404);
  return id;
}

export function GET(_req: Request, ctx: Contexto) {
  return comAdminApi(async () => obterEquipamentoAdmin(await idOuErro(ctx)));
}

/** Arquiva (`arquivado: true`) ou desarquiva (`arquivado: false`). Equipamentos nunca são apagados. */
export function PATCH(req: Request, ctx: Contexto) {
  return comAdminApi(async () => {
    const id = await idOuErro(ctx);
    const { arquivado } = await lerCorpo(req, z.object({ arquivado: z.boolean() }));
    return arquivarEquipamento(id, arquivado);
  });
}
