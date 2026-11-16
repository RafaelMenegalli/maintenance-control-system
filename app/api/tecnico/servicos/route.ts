import { lerCorpo } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { servicoInputSchema } from "@/lib/schemas/entidades";
import { criarServico } from "@/lib/tecnico/servicos";

export const dynamic = "force-dynamic";

/**
 * Cria um serviço. IDEMPOTENTE pelo `id` (UUID gerado no navegador): reenviar o mesmo serviço
 * não duplica o registro. As fotos devem ter sido enviadas antes (POST /api/fotos).
 */
export function POST(req: Request) {
  return comAdminApi(async (sessao) => criarServico(await lerCorpo(req, servicoInputSchema), sessao.user.id));
}
