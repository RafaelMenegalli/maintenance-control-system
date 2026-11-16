import { lerCorpo } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { equipamentoInputSchema } from "@/lib/schemas/entidades";
import { salvarEquipamento } from "@/lib/tecnico/mutacoes";
import { listarEquipamentosAdmin } from "@/lib/tecnico/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return comAdminApi(() => listarEquipamentosAdmin());
}

/** Cria ou edita (se vier `id` existente) um equipamento. */
export function POST(req: Request) {
  return comAdminApi(async () => salvarEquipamento(await lerCorpo(req, equipamentoInputSchema)));
}
