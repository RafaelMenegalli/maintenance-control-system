import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clientes, equipamentos, fotos, locais, servicos, tiposEquipamento } from "@/db/schema";
import type {
  EquipamentoDetalhe,
  LocalDTO,
  ServicoDetalhe,
  TipoEquipamentoDTO,
} from "@/lib/tecnico/data/types";

/**
 * Consultas do técnico (admin) para os route handlers /api/tecnico/*.
 * O `status` NÃO é calculado aqui: quem consome calcula a partir de `proximaData`
 * (igual será na versão offline).
 *
 * ⚠ Estas consultas NÃO filtram por cliente: só podem ser chamadas depois de
 * `comAdminApi()`. Qualquer consulta do portal deve usar `escopoCliente()`.
 */

// Último serviço de cada equipamento (data mais recente; empate → o criado por último).
const ultimoServico = db
  .selectDistinctOn([servicos.equipamentoId], {
    equipamentoId: servicos.equipamentoId,
    data: servicos.data,
    proximaData: servicos.proximaData,
  })
  .from(servicos)
  .orderBy(servicos.equipamentoId, desc(servicos.data), desc(servicos.criadoEm))
  .as("ultimo_servico");

function baseResumo() {
  return db
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
      ultimoServicoEm: ultimoServico.data,
      proximaData: ultimoServico.proximaData,
    })
    .from(equipamentos)
    .innerJoin(locais, eq(locais.id, equipamentos.localId))
    .innerJoin(tiposEquipamento, eq(tiposEquipamento.id, equipamentos.tipoId))
    .leftJoin(ultimoServico, eq(ultimoServico.equipamentoId, equipamentos.id));
}

type LinhaResumo = Awaited<ReturnType<typeof baseResumo>>[number];

function paraResumo({ arquivadoEm, ...r }: LinhaResumo) {
  return { ...r, arquivado: arquivadoEm !== null };
}

export async function listarEquipamentosAdmin() {
  const linhas = await baseResumo().orderBy(asc(equipamentos.nome));
  return linhas.map(paraResumo);
}

export async function obterEquipamentoAdmin(id: string) {
  const [linha] = await baseResumo().where(eq(equipamentos.id, id)).limit(1);
  if (!linha) return null;

  const [extra] = await db
    .select({
      atributos: equipamentos.atributos,
      observacoes: equipamentos.observacoes,
      criadoEm: equipamentos.criadoEm,
      atualizadoEm: equipamentos.atualizadoEm,
      campos: tiposEquipamento.campos,
      checklist: tiposEquipamento.checklist,
    })
    .from(equipamentos)
    .innerJoin(tiposEquipamento, eq(tiposEquipamento.id, equipamentos.tipoId))
    .where(eq(equipamentos.id, id))
    .limit(1);

  return {
    ...paraResumo(linha),
    atributos: extra.atributos,
    observacoes: extra.observacoes,
    campos: extra.campos,
    checklist: extra.checklist,
    criadoEm: extra.criadoEm.toISOString(),
    atualizadoEm: extra.atualizadoEm.toISOString(),
  } satisfies Omit<EquipamentoDetalhe, "status">;
}

export async function listarServicosAdmin(equipamentoId: string): Promise<ServicoDetalhe[]> {
  const linhas = await db
    .select()
    .from(servicos)
    .where(eq(servicos.equipamentoId, equipamentoId))
    .orderBy(desc(servicos.data), desc(servicos.criadoEm));
  if (linhas.length === 0) return [];

  const listaFotos = await db
    .select({
      id: fotos.id,
      servicoId: fotos.servicoId,
      momento: fotos.momento,
      largura: fotos.largura,
      altura: fotos.altura,
    })
    .from(fotos)
    .where(
      inArray(
        fotos.servicoId,
        linhas.map((s) => s.id),
      ),
    )
    .orderBy(asc(fotos.criadoEm));

  return linhas.map((s) => ({
    id: s.id,
    equipamentoId: s.equipamentoId,
    tipo: s.tipo,
    data: s.data,
    descricao: s.descricao,
    checklist: s.checklist,
    proximaData: s.proximaData,
    criadoPor: s.criadoPor,
    criadoEm: s.criadoEm.toISOString(),
    fotos: listaFotos
      .filter((f) => f.servicoId === s.id)
      .map((f) => ({ id: f.id, momento: f.momento, largura: f.largura, altura: f.altura })),
  }));
}

export async function listarTiposAdmin(): Promise<TipoEquipamentoDTO[]> {
  return db
    .select({
      id: tiposEquipamento.id,
      nome: tiposEquipamento.nome,
      icone: tiposEquipamento.icone,
      campos: tiposEquipamento.campos,
      checklist: tiposEquipamento.checklist,
      periodicidadePadraoDias: tiposEquipamento.periodicidadePadraoDias,
      ativo: tiposEquipamento.ativo,
    })
    .from(tiposEquipamento)
    .orderBy(asc(tiposEquipamento.nome));
}

export async function listarLocaisAdmin(): Promise<LocalDTO[]> {
  return db
    .select({
      id: locais.id,
      nome: locais.nome,
      clienteId: locais.clienteId,
      clienteNome: clientes.nome,
    })
    .from(locais)
    .innerJoin(clientes, eq(clientes.id, locais.clienteId))
    .orderBy(asc(clientes.nome), asc(locais.nome));
}
