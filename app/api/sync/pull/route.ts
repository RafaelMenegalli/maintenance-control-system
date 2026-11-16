import { ErroApi } from "@/lib/api";
import { comAdminApi } from "@/lib/auth/permissoes";
import { montarPull } from "@/lib/tecnico/sync-servidor";

export const dynamic = "force-dynamic";

/**
 * Baixa os dados para o celular trabalhar offline. Sem `desde` é a sincronização completa;
 * com `desde` (ISO) vêm só os equipamentos alterados desde então (e os serviços recentes deles).
 */
export function GET(req: Request) {
  return comAdminApi(async () => {
    const texto = new URL(req.url).searchParams.get("desde");
    let desde: Date | null = null;
    if (texto) {
      desde = new Date(texto);
      if (Number.isNaN(desde.getTime())) throw new ErroApi("Data de sincronização inválida.", 400);
    }
    return montarPull(desde);
  });
}
