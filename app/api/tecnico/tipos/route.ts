import { comAdminApi } from "@/lib/auth/permissoes";
import { listarTiposAdmin } from "@/lib/tecnico/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return comAdminApi(() => listarTiposAdmin());
}
