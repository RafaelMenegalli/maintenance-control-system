import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clientes, sessoes, usuarios, type PapelUsuario } from "@/db/schema";
import { ErroApi } from "@/lib/api";
import { auth } from "@/lib/auth";
import { criarUsuario } from "@/lib/auth/usuarios";

/**
 * Gestão de acessos (tela "Acessos" do técnico). ⚠ Só chamar depois de `comAdminApi()`/`exigirAdmin()`.
 * Não existe cadastro público: só o técnico cria acessos.
 */

export type Acesso = {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  clienteId: string | null;
  clienteNome: string | null;
  ativo: boolean;
};

const senhaSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(128, "A senha é muito longa.");

export const novoAcessoSchema = z.object({
  nome: z.string().trim().min(2, "Preencha o nome de quem vai usar o acesso."),
  email: z.string().trim().toLowerCase().email("Preencha um e-mail válido."),
  clienteId: z.string().uuid("Escolha a empresa deste acesso."),
  senha: senhaSchema,
});

export const alterarAcessoSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("redefinir_senha"), senha: senhaSchema }),
  z.object({ acao: z.literal("definir_ativo"), ativo: z.boolean() }),
]);

export async function listarAcessos(): Promise<Acesso[]> {
  return db
    .select({
      id: usuarios.id,
      nome: usuarios.name,
      email: usuarios.email,
      papel: usuarios.papel,
      clienteId: usuarios.clienteId,
      clienteNome: clientes.nome,
      ativo: usuarios.ativo,
    })
    .from(usuarios)
    .leftJoin(clientes, eq(clientes.id, usuarios.clienteId))
    // técnicos primeiro, depois as empresas
    .orderBy(asc(usuarios.papel), desc(usuarios.ativo), asc(usuarios.name));
}

export async function criarAcessoDaEmpresa(dados: z.output<typeof novoAcessoSchema>): Promise<Acesso> {
  const [cliente] = await db.select({ id: clientes.id }).from(clientes).where(eq(clientes.id, dados.clienteId)).limit(1);
  if (!cliente) throw new ErroApi("Empresa não encontrada.", 404);

  const { id, criado } = await criarUsuario({
    nome: dados.nome,
    email: dados.email,
    senha: dados.senha,
    papel: "cliente",
    clienteId: cliente.id,
  });
  if (!criado) throw new ErroApi("Já existe um acesso com este e-mail. Use outro e-mail ou redefina a senha dele.", 409);

  const acesso = (await listarAcessos()).find((a) => a.id === id);
  if (!acesso) throw new ErroApi("Não foi possível criar o acesso.", 500);
  return acesso;
}

async function exigirUsuario(id: string) {
  const [u] = await db.select({ id: usuarios.id, papel: usuarios.papel }).from(usuarios).where(eq(usuarios.id, id)).limit(1);
  if (!u) throw new ErroApi("Acesso não encontrado.", 404);
  return u;
}

/** Troca a senha e encerra os logins abertos desse usuário (ele entra de novo com a senha nova). */
export async function redefinirSenha(id: string, senha: string) {
  await exigirUsuario(id);
  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(id, await ctx.password.hash(senha));
  await db.delete(sessoes).where(eq(sessoes.userId, id));
  return { ok: true };
}

/** Desativa/reativa. O técnico não pode desativar o próprio acesso. */
export async function definirAtivo(id: string, ativo: boolean, solicitanteId: string) {
  await exigirUsuario(id);
  if (!ativo && id === solicitanteId) {
    throw new ErroApi("Você não pode desativar o seu próprio acesso.", 400);
  }
  await db.update(usuarios).set({ ativo }).where(eq(usuarios.id, id));
  if (!ativo) await db.delete(sessoes).where(eq(sessoes.userId, id));
  return { ok: true };
}
