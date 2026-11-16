import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientes, equipamentos, fotos, locais, servicos, tiposEquipamento, usuarios } from "@/db/schema";
import type {
  ClienteDTO,
  EquipamentoDetalhe,
  LocalDTO,
  ServicoDetalhe,
  TipoEquipamentoDetalhe,
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
    .select({ s: servicos, criadoPorNome: usuarios.name })
    .from(servicos)
    .leftJoin(usuarios, eq(usuarios.id, servicos.criadoPor))
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
        linhas.map(({ s }) => s.id),
      ),
    )
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


// SQL escrito à mão (e não com ${colunas}): numa consulta de uma tabela só o Drizzle omite o nome da
// tabela nas colunas, e a subconsulta compararia `tipo_id` com o `id` do próprio equipamento.
const qtdEquipamentosDoTipo = sql<number>`(select count(*)::int from equipamentos eq where eq.tipo_id = tipos_equipamento.id)`;
const qtdEquipamentosDoLocal = sql<number>`(select count(*)::int from equipamentos eq where eq.local_id = locais.id)`;

const colunasTipo = {
  id: tiposEquipamento.id,
  nome: tiposEquipamento.nome,
  icone: tiposEquipamento.icone,
  campos: tiposEquipamento.campos,
  checklist: tiposEquipamento.checklist,
  periodicidadePadraoDias: tiposEquipamento.periodicidadePadraoDias,
  ativo: tiposEquipamento.ativo,
  quantidadeEquipamentos: qtdEquipamentosDoTipo,
};

export async function listarTiposAdmin(): Promise<TipoEquipamentoDTO[]> {
  return db.select(colunasTipo).from(tiposEquipamento).orderBy(asc(tiposEquipamento.nome));
}

export async function obterTipoAdmin(id: string): Promise<TipoEquipamentoDetalhe | null> {
  const [tipo] = await db.select(colunasTipo).from(tiposEquipamento).where(eq(tiposEquipamento.id, id)).limit(1);
  if (!tipo) return null;

  // Quantos equipamentos têm valor preenchido em cada campo.
  const linhas = await db
    .select({ atributos: equipamentos.atributos })
    .from(equipamentos)
    .where(eq(equipamentos.tipoId, id));
  const usoCampos: Record<string, number> = {};
  for (const campo of tipo.campos) {
    usoCampos[campo.key] = linhas.filter((l) => {
      const v = l.atributos[campo.key];
      return v !== undefined && v !== null && v !== "";
    }).length;
  }
  return { ...tipo, usoCampos };
}

export async function listarLocaisAdmin(): Promise<LocalDTO[]> {
  return db
    .select({
      id: locais.id,
      nome: locais.nome,
      clienteId: locais.clienteId,
      clienteNome: clientes.nome,
      quantidadeEquipamentos: qtdEquipamentosDoLocal,
    })
    .from(locais)
    .innerJoin(clientes, eq(clientes.id, locais.clienteId))
    .orderBy(asc(clientes.nome), asc(locais.nome));
}

export async function listarClientesAdmin(): Promise<ClienteDTO[]> {
  const listaClientes = await db.select().from(clientes).orderBy(asc(clientes.nome));
  const listaLocais = await listarLocaisAdmin();
  return listaClientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    cnpj: c.cnpj,
    contato: c.contato,
    locais: listaLocais.filter((l) => l.clienteId === c.id),
  }));
}
