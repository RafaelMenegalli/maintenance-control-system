import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { equipamentos, locais, servicos, tiposEquipamento } from "@/db/schema";
import type { EscopoCliente } from "@/lib/auth/permissoes";

/**
 * Consultas do portal da empresa. ⚠ TODA consulta daqui recebe o `escopo` de
 * `escopoCliente()` e filtra por `locais.cliente_id = escopo.clienteId`. Nunca remover.
 */
export async function obterEquipamentoDoCliente(escopo: EscopoCliente, id: string) {
  const [e] = await db
    .select({
      id: equipamentos.id,
      nome: equipamentos.nome,
      tipoNome: tiposEquipamento.nome,
      localNome: locais.nome,
      periodicidadeDias: equipamentos.periodicidadeDias,
    })
    .from(equipamentos)
    .innerJoin(locais, eq(locais.id, equipamentos.localId))
    .innerJoin(tiposEquipamento, eq(tiposEquipamento.id, equipamentos.tipoId))
    .where(and(eq(equipamentos.id, id), eq(locais.clienteId, escopo.clienteId)))
    .limit(1);
  if (!e) return null;

  const [ultimo] = await db
    .select({ data: servicos.data, proximaData: servicos.proximaData })
    .from(servicos)
    .where(eq(servicos.equipamentoId, e.id))
    .orderBy(desc(servicos.data), desc(servicos.criadoEm))
    .limit(1);

  return { ...e, ultimoServicoEm: ultimo?.data ?? null, proximaData: ultimo?.proximaData ?? null };
}
