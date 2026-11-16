import { asc, desc, eq, inArray, lte, or, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { equipamentos, fotos, locais, servicos, tiposEquipamento, usuarios } from "@/db/schema";
import { ErroApi } from "@/lib/api";
import type { ServicoDetalhe } from "@/lib/tecnico/data/types";
import { criarServico } from "@/lib/tecnico/servicos";
import { listarClientesAdmin, listarTiposAdmin, ultimoServicoPorEquipamento } from "@/lib/tecnico/queries";
import {
  SERVICOS_POR_EQUIPAMENTO,
  type EquipamentoSincronizado,
  type ResultadoPush,
  type RespostaPull,
  type ServicoParaEnviar,
} from "@/lib/tecnico/sync/tipos";

/**
 * Lado servidor da sincronização do técnico. ⚠ Sem filtro de cliente: só chamar depois de `comAdminApi()`.
 */

/** Serviços (com checklist e fotos) pelos ids, do mais recente para o mais antigo. */
export async function servicosDetalhePorIds(ids: string[]): Promise<ServicoDetalhe[]> {
  if (ids.length === 0) return [];
  const linhas = await db
    .select({ s: servicos, criadoPorNome: usuarios.name })
    .from(servicos)
    .leftJoin(usuarios, eq(usuarios.id, servicos.criadoPor))
    .where(inArray(servicos.id, ids))
    .orderBy(desc(servicos.data), desc(servicos.criadoEm));
  const listaFotos = await db
    .select({ id: fotos.id, servicoId: fotos.servicoId, momento: fotos.momento, largura: fotos.largura, altura: fotos.altura })
    .from(fotos)
    .where(inArray(fotos.servicoId, ids))
    .orderBy(asc(fotos.criadoEm));

  return linhas.map(({ s, criadoPorNome }) => ({
    id: s.id,
    equipamentoId: s.equipamentoId,
    tipo: s.tipo,
    data: s.data,
    descricao: s.descricao,
    checklist: s.checklist,
    proximaData: s.proximaData,
    criadoPor: s.criadoPor,
    criadoPorNome,
    criadoEm: s.criadoEm.toISOString(),
    fotos: listaFotos
      .filter((f) => f.servicoId === s.id)
      .map((f) => ({ id: f.id, momento: f.momento, largura: f.largura, altura: f.altura })),
  }));
}

/** Detalhe completo dos equipamentos alterados desde `desde` (todos se `desde` for nulo). */
async function equipamentosAlterados(desde: Date | null): Promise<EquipamentoSincronizado[]> {
  const alterado = desde
    ? or(
        gt(equipamentos.atualizadoEm, desde),
        sql`exists (select 1 from servicos sv where sv.equipamento_id = ${equipamentos.id} and sv.atualizado_em > ${desde.toISOString()}::timestamptz)`,
      )
    : undefined;

  const linhas = await db
    .select({
      id: equipamentos.id,
      nome: equipamentos.nome,
      tipoId: equipamentos.tipoId,
      tipoNome: tiposEquipamento.nome,
      tipoIcone: tiposEquipamento.icone,
      localId: equipamentos.localId,
      localNome: locais.nome,
      clienteId: locais.clienteId,
      periodicidadeDias: equipamentos.periodicidadeDias,
      arquivadoEm: equipamentos.arquivadoEm,
      ultimoServicoEm: ultimoServicoPorEquipamento.data,
      proximaData: ultimoServicoPorEquipamento.proximaData,
      atributos: equipamentos.atributos,
      observacoes: equipamentos.observacoes,
      criadoEm: equipamentos.criadoEm,
      atualizadoEm: equipamentos.atualizadoEm,
      campos: tiposEquipamento.campos,
      checklist: tiposEquipamento.checklist,
    })
    .from(equipamentos)
    .innerJoin(locais, eq(locais.id, equipamentos.localId))
    .innerJoin(tiposEquipamento, eq(tiposEquipamento.id, equipamentos.tipoId))
    .leftJoin(ultimoServicoPorEquipamento, eq(ultimoServicoPorEquipamento.equipamentoId, equipamentos.id))
    .where(alterado)
    .orderBy(asc(equipamentos.nome));

  return linhas.map(({ arquivadoEm, criadoEm, atualizadoEm, ...e }) => ({
    ...e,
    arquivado: arquivadoEm !== null,
    criadoEm: criadoEm.toISOString(),
    atualizadoEm: atualizadoEm.toISOString(),
  }));
}

/** Os `limite` serviços mais recentes de cada equipamento informado, agrupados por equipamento. */
async function servicosRecentesPorEquipamento(
  idsEquipamentos: string[],
  limite: number,
): Promise<Record<string, ServicoDetalhe[]>> {
  const resultado: Record<string, ServicoDetalhe[]> = Object.fromEntries(idsEquipamentos.map((id) => [id, []]));
  if (idsEquipamentos.length === 0) return resultado;

  const ranque = db
    .select({
      id: servicos.id,
      rn: sql<number>`row_number() over (partition by ${servicos.equipamentoId} order by ${servicos.data} desc, ${servicos.criadoEm} desc)`.as("rn"),
    })
    .from(servicos)
    .where(inArray(servicos.equipamentoId, idsEquipamentos))
    .as("ranque");
  const escolhidos = await db.select({ id: ranque.id }).from(ranque).where(lte(ranque.rn, limite));

  for (const s of await servicosDetalhePorIds(escolhidos.map((e) => e.id))) {
    (resultado[s.equipamentoId] ??= []).push(s);
  }
  return resultado;
}

/** GET /api/sync/pull — tudo o que o celular precisa para trabalhar offline (incremental com `desde`). */
export async function montarPull(desde: Date | null): Promise<RespostaPull> {
  const agora = new Date();
  const [tipos, clientes, lista] = await Promise.all([
    listarTiposAdmin(),
    listarClientesAdmin(),
    equipamentosAlterados(desde),
  ]);
  const servicosPorEquipamento = await servicosRecentesPorEquipamento(
    lista.map((e) => e.id),
    SERVICOS_POR_EQUIPAMENTO,
  );
  return {
    agora: agora.toISOString(),
    completo: desde === null,
    tipos,
    clientes,
    equipamentos: lista,
    servicosPorEquipamento,
  };
}

/**
 * POST /api/sync/push — cria os serviços da fila. IDEMPOTENTE (`criarServico` usa `on conflict do nothing`):
 * repetir o lote nunca duplica. Um serviço com problema não derruba os outros.
 */
export async function receberServicos(lote: ServicoParaEnviar[], usuarioId: string): Promise<ResultadoPush[]> {
  const resultados: ResultadoPush[] = [];
  for (const item of lote) {
    try {
      const dados = { ...item, fotos: item.fotos ?? [], proximaData: item.proximaData ?? null };
      const { criado, fotosFaltando } = await criarServico(dados as Parameters<typeof criarServico>[0], usuarioId);
      if (fotosFaltando.length > 0) {
        // O serviço já existe no servidor, mas faltam arquivos de foto: o celular reenvia e repete.
        resultados.push({ id: item.id, ok: false, criado, fotosFaltando });
        continue;
      }
      const [servico] = await servicosDetalhePorIds([item.id]);
      resultados.push({ id: item.id, ok: true, criado, servico });
    } catch (e) {
      if (e instanceof ErroApi) {
        resultados.push({ id: item.id, ok: false, erro: e.message, permanente: e.status >= 400 && e.status < 500 });
      } else {
        console.error("Erro ao receber serviço da fila:", e);
        resultados.push({ id: item.id, ok: false, erro: "Erro interno ao salvar o serviço." });
      }
    }
  }
  return resultados;
}
