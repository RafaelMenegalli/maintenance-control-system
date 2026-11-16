import { ErroApi, idValido, lerCorpo } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { servicoEdicaoSchema } from "@/lib/schemas/entidades";
import { editarServico, excluirServico } from "@/lib/tecnico/servicos";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

async function idOuErro(ctx: Contexto) {
  const { id } = await ctx.params;
  if (!idValido(id)) throw new ErroApi("Serviço não encontrado.", 404);
  return id;
}

export function PUT(req: Request, ctx: Contexto) {
  return comAdminApi(async () => {
    const id = await idOuErro(ctx);
    return editarServico(id, await lerCorpo(req, servicoEdicaoSchema));
  });
}

export function DELETE(_req: Request, ctx: Contexto) {
  return comAdminApi(async () => excluirServico(await idOuErro(ctx)));
}
