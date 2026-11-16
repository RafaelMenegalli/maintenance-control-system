import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { equipamentos, locais, tiposEquipamento } from "@/db/schema";
import type { EscopoCliente } from "@/lib/auth/permissoes";
import { calcularStatus } from "@/lib/status";
import type { EquipamentoDetalhe, EquipamentoResumo, ServicoDetalhe } from "@/lib/tecnico/data/types";
import { baseResumo, listarServicosAdmin, obterEquipamentoAdmin, paraResumo } from "@/lib/tecnico/queries";

/**
 * Consultas do portal da empresa. ⚠ TODA consulta daqui recebe o `escopo` de
 * `escopoCliente()` e filtra por `locais.cliente_id = escopo.clienteId`. Nunca remover.
 * (As consultas reaproveitadas de lib/tecnico/queries.ts não filtram por cliente: só são
 * chamadas depois de conferir, aqui, que o equipamento é do cliente.)
 */

/** Equipamentos ATIVOS do cliente, com status calculado (lib/status.ts). */
export async function listarEquipamentosDoCliente(escopo: EscopoCliente): Promise<EquipamentoResumo[]> {
  const linhas = await baseResumo()
    .where(and(eq(locais.clienteId, escopo.clienteId), isNull(equipamentos.arquivadoEm)))
    .orderBy(asc(locais.nome), asc(equipamentos.nome));
  return linhas.map((l) => {
    const r = paraResumo(l);
    return { ...r, status: calcularStatus(r.proximaData) };
  });
}

/** O equipamento é do cliente? (e não está arquivado) */
async function equipamentoPertenceAoCliente(escopo: EscopoCliente, id: string): Promise<boolean> {
  const [e] = await db
    .select({ id: equipamentos.id })
    .from(equipamentos)
    .innerJoin(locais, eq(locais.id, equipamentos.localId))
    .where(and(eq(equipamentos.id, id), eq(locais.clienteId, escopo.clienteId), isNull(equipamentos.arquivadoEm)))
    .limit(1);
  return !!e;
}

/** Detalhe do equipamento; equipamento de outro cliente (ou inexistente) devolve `null`. */
export async function obterEquipamentoDoCliente(escopo: EscopoCliente, id: string): Promise<EquipamentoDetalhe | null> {
  if (!(await equipamentoPertenceAoCliente(escopo, id))) return null;
  const e = await obterEquipamentoAdmin(id);
  if (!e) return null;
  return { ...e, status: calcularStatus(e.proximaData) };
}

/** Serviços do equipamento (com checklist e fotos); `null` se o equipamento não é do cliente. */
export async function listarServicosDoEquipamentoDoCliente(
  escopo: EscopoCliente,
  equipamentoId: string,
): Promise<ServicoDetalhe[] | null> {
  if (!(await equipamentoPertenceAoCliente(escopo, equipamentoId))) return null;
  return listarServicosAdmin(equipamentoId);
}

/** Locais e tipos que o cliente tem (para os filtros de equipamentos e de relatório). */
export async function listarOpcoesDoCliente(escopo: EscopoCliente) {
  const listaLocais = await db
    .select({ id: locais.id, nome: locais.nome, clienteId: locais.clienteId })
    .from(locais)
    .where(eq(locais.clienteId, escopo.clienteId))
    .orderBy(asc(locais.nome));

  const listaTipos = await db
    .selectDistinct({ id: tiposEquipamento.id, nome: tiposEquipamento.nome })
    .from(equipamentos)
    .innerJoin(locais, eq(locais.id, equipamentos.localId))
    .innerJoin(tiposEquipamento, eq(tiposEquipamento.id, equipamentos.tipoId))
    .where(eq(locais.clienteId, escopo.clienteId))
    .orderBy(asc(tiposEquipamento.nome));

  return { locais: listaLocais, tipos: listaTipos };
}
