import { z } from "zod";

/**
 * Variáveis de ambiente validadas com Zod. Importe `env` em vez de usar
 * `process.env` direto. Se algo estiver faltando, o app para na inicialização
 * com uma mensagem dizendo exatamente o que corrigir.
 */
const schemaBase = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL não definida" })
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL deve começar com postgresql://"),
  BETTER_AUTH_SECRET: z
    .string({ error: "BETTER_AUTH_SECRET não definida" })
    .min(32, "BETTER_AUTH_SECRET precisa ter pelo menos 32 caracteres"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL deve ser uma URL (ex.: http://localhost:3000)"),
  UPLOAD_DIR: z.string().min(1, "UPLOAD_DIR não definida"),
});

const schemaSeed = z.object({
  SEED_ADMIN_NOME: z.string().min(1, "SEED_ADMIN_NOME não definida"),
  SEED_ADMIN_EMAIL: z.email("SEED_ADMIN_EMAIL deve ser um e-mail válido"),
  SEED_ADMIN_SENHA: z.string().min(6, "SEED_ADMIN_SENHA precisa ter pelo menos 6 caracteres"),
});

function validar<T extends z.ZodType>(schema: T, origem: NodeJS.ProcessEnv): z.infer<T> {
  const resultado = schema.safeParse(origem);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((i) => `  - ${i.path.join(".") || "(env)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas (confira o arquivo .env):\n${problemas}`);
  }
  return resultado.data;
}

export const env = validar(schemaBase, process.env);

/** Variáveis usadas só pelos seeds (`pnpm db:seed`). */
export function getSeedEnv() {
  return validar(schemaSeed, process.env);
}
