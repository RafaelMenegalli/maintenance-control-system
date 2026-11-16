import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contas, sessoes, usuarios, verificacoes } from "@/db/schema";
import { env } from "@/lib/env";

/**
 * Better Auth — e-mail e senha, SEM cadastro público (`disableSignUp`).
 * Só o técnico cria acessos (via `criarUsuario` em lib/auth/usuarios.ts).
 *
 * O objeto `schema` mapeia os modelos do Better Auth para as tabelas em português.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: usuarios,
      session: sessoes,
      account: contas,
      verification: verificacoes,
    },
  }),
  advanced: {
    // IDs sempre UUID (colunas uuid no banco).
    database: { generateId: "uuid" },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  session: {
    // O técnico usa o app em campo: mantém o login por 30 dias.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      papel: { type: ["admin", "cliente"], required: false, defaultValue: "cliente", input: false },
      clienteId: { type: "string", required: false, input: false },
      ativo: { type: "boolean", required: false, defaultValue: true, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Usuário inativo não entra (e sessões já abertas são barradas em lib/auth/permissoes.ts).
        before: async (sessao) => {
          const [usuario] = await db
            .select({ ativo: usuarios.ativo })
            .from(usuarios)
            .where(eq(usuarios.id, sessao.userId))
            .limit(1);
          if (!usuario?.ativo) {
            throw new APIError("FORBIDDEN", {
              code: "USUARIO_INATIVO",
              message: "Este acesso está desativado. Fale com o técnico responsável.",
            });
          }
        },
      },
    },
  },
  // nextCookies deve ser o último plugin (permite login/logout em Server Actions).
  plugins: [nextCookies()],
});

export type Sessao = typeof auth.$Infer.Session;
