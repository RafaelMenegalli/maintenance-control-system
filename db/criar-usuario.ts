/**
 * Cria um acesso pela linha de comando (a tela "Acessos" só chega em etapa futura).
 *
 *   pnpm db:usuario --nome "Maria" --email maria@empresa.com --senha "SenhaForte123" --papel cliente [--cliente <uuid>]
 *
 * Se `--papel cliente` e `--cliente` não for informado, usa o primeiro cliente cadastrado.
 * Idempotente: se o e-mail já existe, não altera nada.
 */
import { parseArgs } from "node:util";
import { asc, eq } from "drizzle-orm";
import { criarUsuario } from "@/lib/auth/usuarios";
import { db } from "./index";
import { clientes } from "./schema";

async function main() {
  const { values } = parseArgs({
    options: {
      nome: { type: "string" },
      email: { type: "string" },
      senha: { type: "string" },
      papel: { type: "string", default: "cliente" },
      cliente: { type: "string" },
    },
  });

  if (!values.nome || !values.email || !values.senha) {
    throw new Error('Informe --nome, --email e --senha. Exemplo: pnpm db:usuario --nome "Maria" --email maria@empresa.com --senha "SenhaForte123" --papel cliente');
  }
  if (values.papel !== "admin" && values.papel !== "cliente") {
    throw new Error('--papel deve ser "admin" ou "cliente".');
  }
  if (values.senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");

  let clienteId: string | null = null;
  if (values.papel === "cliente") {
    if (values.cliente) {
      const [c] = await db.select({ id: clientes.id }).from(clientes).where(eq(clientes.id, values.cliente)).limit(1);
      if (!c) throw new Error("Cliente não encontrado para o id informado em --cliente.");
      clienteId = c.id;
    } else {
      const [primeiro] = await db.select({ id: clientes.id }).from(clientes).orderBy(asc(clientes.nome)).limit(1);
      if (!primeiro) throw new Error("Não há nenhum cliente cadastrado. Rode `pnpm db:seed:demo` ou informe --cliente.");
      clienteId = primeiro.id;
    }
  }

  const { criado } = await criarUsuario({
    nome: values.nome,
    email: values.email,
    senha: values.senha,
    papel: values.papel,
    clienteId,
  });
  console.log(criado ? `✓ Acesso criado: ${values.email} (${values.papel})` : `• Já existe um acesso com este e-mail (nada foi alterado): ${values.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
