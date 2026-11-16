import { comAdminApi } from "@/lib/auth/permissoes";
import { listarServicosRecentesAdmin } from "@/lib/tecnico/servicos";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const limite = Number(new URL(req.url).searchParams.get("limite") ?? 10);
  return comAdminApi(() => listarServicosRecentesAdmin(Number.isFinite(limite) ? Math.min(Math.max(limite, 1), 100) : 10));
}
