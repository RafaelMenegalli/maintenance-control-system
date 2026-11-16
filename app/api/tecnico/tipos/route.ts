import { lerCorpo } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { tipoInputSchema } from "@/lib/schemas/entidades";
import { salvarTipo } from "@/lib/tecnico/mutacoes";
import { listarTiposAdmin } from "@/lib/tecnico/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return comAdminApi(() => listarTiposAdmin());
}

/** Cria ou edita (se vier `id` existente) um tipo de equipamento. */
export function POST(req: Request) {
  return comAdminApi(async () => salvarTipo(await lerCorpo(req, tipoInputSchema)));
}
