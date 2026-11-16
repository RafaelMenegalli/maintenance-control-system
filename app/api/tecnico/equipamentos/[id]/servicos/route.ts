import { z } from "zod";
import { comAdminApi } from "@/lib/auth/permissoes";
import { listarServicosAdmin } from "@/lib/tecnico/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return Response.json({ erro: "Não encontrado." }, { status: 404 });
  }
  return comAdminApi(() => listarServicosAdmin(id));
}
