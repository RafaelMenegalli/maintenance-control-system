import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, equipamentos, locais, tiposEquipamento } from "@/db/schema";
import { ErroApi } from "@/lib/api";
import { criarSchemaArmazenado } from "@/lib/schemas/atributos";
import type { ClienteInput, EquipamentoInput, LocalInput, TipoInput } from "@/lib/schemas/entidades";
import {
  clienteInputSchema,
  equipamentoInputSchema,
  localInputSchema,
  tipoInputSchema,
} from "@/lib/schemas/entidades";
import { gerarKey } from "@/lib/chaves";
import type { z } from "zod";

/**
 * Escritas do técnico (admin). Sempre chamadas depois de `comAdminApi()`.
 * Revalidam os dados com os mesmos schemas Zod dos formulários.
 */

type ClienteSaida = z.output<typeof clienteInputSchema>;
type LocalSaida = z.output<typeof localInputSchema>;
type TipoSaida = z.output<typeof tipoInputSchema>;
type EquipamentoSaida = z.output<typeof equipamentoInputSchema>;

// ───────────────────────── Clientes e locais ─────────────────────────

export async function salvarCliente(dados: ClienteSaida) {
  const valores = { nome: dados.nome, cnpj: dados.cnpj, contato: dados.contato };
  if (dados.id) {
    const [c] = await db.update(clientes).set(valores).where(eq(clientes.id, dados.id)).returning();
    if (c) return c;
  }
  const [novo] = await db
    .insert(clientes)
    .values({ ...(dados.id ? { id: dados.id } : {}), ...valores })
    .onConflictDoNothing({ target: clientes.id })
    .returning();
  if (novo) return novo;
  const [existente] = await db.select().from(clientes).where(eq(clientes.id, dados.id!)).limit(1);
  return existente;
}

export async function salvarLocal(dados: LocalSaida) {
  const [cliente] = await db.select({ id: clientes.id }).from(clientes).where(eq(clientes.id, dados.clienteId)).limit(1);
  if (!cliente) throw new ErroApi("Cliente não encontrado.", 404);

  if (dados.id) {
    const [l] = await db
      .update(locais)
      .set({ nome: dados.nome })
      .where(eq(locais.id, dados.id))
      .returning();
    if (l) return l;
  }
  const [novo] = await db
    .insert(locais)
    .values({ ...(dados.id ? { id: dados.id } : {}), clienteId: dados.clienteId, nome: dados.nome })
    .onConflictDoNothing({ target: locais.id })
    .returning();
  if (novo) return novo;
  const [existente] = await db.select().from(locais).where(eq(locais.id, dados.id!)).limit(1);
  return existente;
}

export async function excluirLocal(id: string) {
  const [{ total }] = await db.select({ total: count() }).from(equipamentos).where(eq(equipamentos.localId, id));
  if (total > 0) {
    throw new ErroApi(
      `Este local tem ${total} equipamento${total === 1 ? "" : "s"}. Mude ou arquive os equipamentos antes de excluir o local.`,
      409,
    );
  }
  const removidos = await db.delete(locais).where(eq(locais.id, id)).returning({ id: locais.id });
  if (removidos.length === 0) throw new ErroApi("Local não encontrado.", 404);
  return { ok: true };
}

// ───────────────────────── Tipos de equipamento ─────────────────────────

/** Dá uma `key` aos campos e itens novos (key vazia). As keys já existentes nunca mudam. */
function completarKeys(dados: TipoSaida) {
  const keysCampos = new Set(dados.campos.map((c) => c.key).filter(Boolean));
  const campos = dados.campos.map((c) => {
    if (c.key) return c;
    const key = gerarKey(c.label, keysCampos);
    keysCampos.add(key);
    return { ...c, key };
  });
  const keysItens = new Set(dados.checklist.map((i) => i.key).filter(Boolean));
  const checklist = dados.checklist.map((i) => {
    if (i.key) return i;
    const key = gerarKey(i.label, keysItens);
    keysItens.add(key);
    return { ...i, key };
  });
  return { campos, checklist };
}

export async function salvarTipo(dados: TipoSaida) {
  const { campos, checklist } = completarKeys(dados);
  const valores = {
    nome: dados.nome,
    icone: dados.icone,
    periodicidadePadraoDias: dados.periodicidadePadraoDias,
    campos,
    checklist,
  };

  const [duplicado] = await db
    .select({ id: tiposEquipamento.id })
    .from(tiposEquipamento)
    .where(eq(tiposEquipamento.nome, dados.nome))
    .limit(1);
  if (duplicado && duplicado.id !== dados.id) {
    throw new ErroApi("Já existe um tipo com este nome. Use outro nome.", 409);
  }

  if (dados.id) {
    const [t] = await db.update(tiposEquipamento).set(valores).where(eq(tiposEquipamento.id, dados.id)).returning();
    if (t) return t;
  }
  const [novo] = await db
    .insert(tiposEquipamento)
    .values({ ...(dados.id ? { id: dados.id } : {}), ...valores, ativo: true })
    .onConflictDoNothing({ target: tiposEquipamento.id })
    .returning();
  if (novo) return novo;
  const [existente] = await db.select().from(tiposEquipamento).where(eq(tiposEquipamento.id, dados.id!)).limit(1);
  return existente;
}

export async function definirTipoAtivo(id: string, ativo: boolean) {
  const [t] = await db.update(tiposEquipamento).set({ ativo }).where(eq(tiposEquipamento.id, id)).returning();
  if (!t) throw new ErroApi("Tipo não encontrado.", 404);
  return t;
}

export async function excluirTipo(id: string) {
  const [{ total }] = await db.select({ total: count() }).from(equipamentos).where(eq(equipamentos.tipoId, id));
  if (total > 0) {
    throw new ErroApi(
      `Este tipo tem ${total} equipamento${total === 1 ? "" : "s"} e não pode ser excluído. Você pode arquivá-lo.`,
      409,
    );
  }
  const removidos = await db.delete(tiposEquipamento).where(eq(tiposEquipamento.id, id)).returning({ id: tiposEquipamento.id });
  if (removidos.length === 0) throw new ErroApi("Tipo não encontrado.", 404);
  return { ok: true };
}

// ───────────────────────── Equipamentos ─────────────────────────

export async function salvarEquipamento(dados: EquipamentoSaida) {
  const [tipo] = await db.select().from(tiposEquipamento).where(eq(tiposEquipamento.id, dados.tipoId)).limit(1);
  if (!tipo) throw new ErroApi("Tipo não encontrado.", 404);
  const [local] = await db.select({ id: locais.id }).from(locais).where(eq(locais.id, dados.localId)).limit(1);
  if (!local) throw new ErroApi("Local não encontrado.", 404);

  // Valida os valores contra os campos atuais do tipo (e descarta chaves desconhecidas).
  const validacao = criarSchemaArmazenado(tipo.campos).safeParse(dados.atributos);
  if (!validacao.success) throw new ErroApi(validacao.error.issues[0]?.message ?? "Dados inválidos.", 400);
  const atributos = Object.fromEntries(
    tipo.campos.map((c) => [c.key, (dados.atributos[c.key] ?? null) as string | number | boolean | null]),
  );

  const valores = {
    localId: dados.localId,
    tipoId: dados.tipoId,
    nome: dados.nome,
    periodicidadeDias: dados.periodicidadeDias,
    atributos,
    observacoes: dados.observacoes,
  };

  if (dados.id) {
    // Valores de campos que já foram removidos do tipo continuam guardados.
    const [atual] = await db
      .select({ atributos: equipamentos.atributos })
      .from(equipamentos)
      .where(eq(equipamentos.id, dados.id))
      .limit(1);
    const [e] = await db
      .update(equipamentos)
      .set({ ...valores, atributos: { ...(atual?.atributos ?? {}), ...atributos }, atualizadoEm: new Date() })
      .where(eq(equipamentos.id, dados.id))
      .returning();
    if (e) return e;
  }
  const [novo] = await db
    .insert(equipamentos)
    .values({ ...(dados.id ? { id: dados.id } : {}), ...valores })
    .onConflictDoNothing({ target: equipamentos.id })
    .returning();
  if (novo) return novo;
  const [existente] = await db.select().from(equipamentos).where(eq(equipamentos.id, dados.id!)).limit(1);
  return existente;
}

export async function arquivarEquipamento(id: string, arquivar: boolean) {
  const [e] = await db
    .update(equipamentos)
    .set({ arquivadoEm: arquivar ? new Date() : null, atualizadoEm: new Date() })
    .where(eq(equipamentos.id, id))
    .returning();
  if (!e) throw new ErroApi("Equipamento não encontrado.", 404);
  return e;
}

export type { ClienteInput, EquipamentoInput, LocalInput, TipoInput };
