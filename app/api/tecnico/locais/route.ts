import { lerCorpo } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { localInputSchema } from "@/lib/schemas/entidades";
import { salvarLocal } from "@/lib/tecnico/mutacoes";
import { listarLocaisAdmin } from "@/lib/tecnico/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return comAdminApi(() => listarLocaisAdmin());
}

/** Cria ou edita (se vier `id` existente) um local. */
export function POST(req: Request) {
  return comAdminApi(async () => salvarLocal(await lerCorpo(req, localInputSchema)));
}
