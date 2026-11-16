import { lerCorpo } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { clienteInputSchema } from "@/lib/schemas/entidades";
import { salvarCliente } from "@/lib/tecnico/mutacoes";
import { listarClientesAdmin } from "@/lib/tecnico/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return comAdminApi(() => listarClientesAdmin());
}

/** Cria ou edita (se vier `id` existente) um cliente. */
export function POST(req: Request) {
  return comAdminApi(async () => salvarCliente(await lerCorpo(req, clienteInputSchema)));
}
