import { ErroApi, idValido, lerCorpo } from "@/lib/api";
import { alterarAcessoSchema, definirAtivo, redefinirSenha } from "@/lib/auth/acessos";
import { comAdminApi } from "@/lib/auth/permissoes";

export const dynamic = "force-dynamic";

/**
 * Altera um acesso. Só admin.
 * - `{ acao: "redefinir_senha", senha }`
 * - `{ acao: "definir_ativo", ativo }` (o técnico não pode desativar a si mesmo)
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return comAdminApi(async (sessao) => {
    if (!idValido(id)) throw new ErroApi("Acesso não encontrado.", 404);
    const dados = await lerCorpo(req, alterarAcessoSchema);
    return dados.acao === "redefinir_senha"
      ? redefinirSenha(id, dados.senha)
      : definirAtivo(id, dados.ativo, sessao.user.id);
  });
}
