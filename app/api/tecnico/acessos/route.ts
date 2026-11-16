import { criado, lerCorpo } from "@/lib/api";
import { criarAcessoDaEmpresa, listarAcessos, novoAcessoSchema } from "@/lib/auth/acessos";
import { comAdminApi } from "@/lib/auth/permissoes";

export const dynamic = "force-dynamic";

/** Lista os acessos (técnico e empresas). Só admin. */
export async function GET() {
  return comAdminApi(() => listarAcessos());
}

/** Cria o acesso de uma empresa (nome, e-mail, empresa e senha inicial). Só admin. */
export async function POST(req: Request) {
  return comAdminApi(async () => {
    const dados = await lerCorpo(req, novoAcessoSchema);
    return criado(await criarAcessoDaEmpresa(dados));
  });
}
