import { auth } from "@/lib/auth";
import type { PapelUsuario } from "@/db/schema";

/**
 * Cria um acesso (e-mail + senha). Não existe cadastro público: o Better Auth tem
 * `disableSignUp`, então a criação passa pelo adaptador interno — usado pelo seed
 * e, nas próximas etapas, pela tela "Acessos" do técnico (que deve chamar
 * `exigirAdmin()` antes).
 *
 * Idempotente: se o e-mail já existe, não altera nada e devolve `criado: false`.
 */
export async function criarUsuario(dados: {
  nome: string;
  email: string;
  senha: string;
  papel: PapelUsuario;
  clienteId?: string | null;
}): Promise<{ id: string; criado: boolean }> {
  const ctx = await auth.$context;
  const email = dados.email.trim().toLowerCase();

  const existente = await ctx.internalAdapter.findUserByEmail(email);
  if (existente) return { id: existente.user.id, criado: false };

  const usuario = await ctx.internalAdapter.createUser(
    {
      name: dados.nome.trim(),
      email,
      emailVerified: true,
      papel: dados.papel,
      clienteId: dados.clienteId ?? null,
      ativo: true,
    },
    { method: "admin" },
  );

  await ctx.internalAdapter.linkAccount({
    userId: usuario.id,
    providerId: "credential",
    accountId: usuario.id,
    password: await ctx.password.hash(dados.senha),
  });

  return { id: usuario.id, criado: true };
}
