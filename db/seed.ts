/**
 * Seed base (idempotente): tipos de equipamento da seção 4 do escopo + usuário admin.
 * Rode com `pnpm db:seed`. Pode rodar quantas vezes quiser: o que já existe não é alterado.
 */
import { eq } from "drizzle-orm";
import { campoDefinicaoSchema } from "@/lib/schemas/campo";
import { itemChecklistSchema } from "@/lib/schemas/checklist";
import { criarUsuario } from "@/lib/auth/usuarios";
import { getSeedEnv } from "@/lib/env";
import { db } from "./index";
import { TIPOS_SEED } from "./seed-data/tipos";
import { tiposEquipamento } from "./schema";

async function seedTipos() {
  for (const tipo of TIPOS_SEED) {
    // Garante que o seed obedece aos mesmos schemas JSONB do restante do app.
    tipo.campos.forEach((c) => campoDefinicaoSchema.parse(c));
    tipo.checklist.forEach((i) => itemChecklistSchema.parse(i));

    const [existente] = await db
      .select({ id: tiposEquipamento.id })
      .from(tiposEquipamento)
      .where(eq(tiposEquipamento.nome, tipo.nome))
      .limit(1);

    if (existente) {
      console.log(`• Tipo já existe (mantido): ${tipo.nome}`);
      continue;
    }
    await db.insert(tiposEquipamento).values({ ...tipo, ativo: true });
    console.log(`✓ Tipo criado: ${tipo.nome}`);
  }
}

async function seedAdmin() {
  const e = getSeedEnv();
  if (e.SEED_ADMIN_SENHA.length < 8) {
    console.warn("! SEED_ADMIN_SENHA tem menos de 8 caracteres. Em produção, use uma senha mais forte.");
  }
  const { criado } = await criarUsuario({
    nome: e.SEED_ADMIN_NOME,
    email: e.SEED_ADMIN_EMAIL,
    senha: e.SEED_ADMIN_SENHA,
    papel: "admin",
  });
  console.log(
    criado ? `✓ Admin criado: ${e.SEED_ADMIN_EMAIL}` : `• Admin já existe (mantido): ${e.SEED_ADMIN_EMAIL}`,
  );
}

async function main() {
  await seedTipos();
  await seedAdmin();
  console.log("Seed concluído.");
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error("Falha no seed:", erro);
    process.exit(1);
  });
