import { comAdminApi } from "@/lib/auth/permissoes";
import { listarLocaisAdmin } from "@/lib/tecnico/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return comAdminApi(() => listarLocaisAdmin());
}
