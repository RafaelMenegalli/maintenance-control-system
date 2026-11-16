import { z } from "zod";
import { ErroApi, idValido, lerCorpo } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { definirTipoAtivo, excluirTipo } from "@/lib/tecnico/mutacoes";
import { obterTipoAdmin } from "@/lib/tecnico/queries";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

async function idOuErro(ctx: Contexto) {
  const { id } = await ctx.params;
  if (!idValido(id)) throw new ErroApi("Tipo não encontrado.", 404);
  return id;
}

export function GET(_req: Request, ctx: Contexto) {
  return comAdminApi(async () => obterTipoAdmin(await idOuErro(ctx)));
}

/** Arquiva (`ativo: false`) ou reativa (`ativo: true`) o tipo. */
export function PATCH(req: Request, ctx: Contexto) {
  return comAdminApi(async () => {
    const id = await idOuErro(ctx);
    const { ativo } = await lerCorpo(req, z.object({ ativo: z.boolean() }));
    return definirTipoAtivo(id, ativo);
  });
}

/** Exclui o tipo — só se não tiver equipamentos. */
export function DELETE(_req: Request, ctx: Contexto) {
  return comAdminApi(async () => excluirTipo(await idOuErro(ctx)));
}
