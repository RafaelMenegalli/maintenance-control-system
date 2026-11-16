import { and, asc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { clientes, equipamentos, fotos, locais, servicos, tiposEquipamento } from "@/db/schema";
import type { EscopoCliente } from "@/lib/auth/permissoes";
import { lerMiniatura } from "@/lib/fotos/miniatura";
import type { FiltrosRelatorio } from "@/lib/relatorios/filtros";
import { ROTULOS_TIPO_SERVICO } from "@/lib/schemas/entidades";
import type { RespostaChecklist } from "@/lib/schemas/checklist";
import { calcularStatus } from "@/lib/status";
import { baseResumo, paraResumo } from "@/lib/tecnico/queries";

/** Máximo de fotos de cada serviço no PDF (as demais continuam no sistema). */
export const MAX_FOTOS_NO_PDF = 4;

export type FotoDoRelatorio = { momento: "antes" | "depois"; imagem: Buffer };

export type ServicoDoRelatorio = {
  id: string;
  data: string;
  equipamento: string;
  local: string;
  tipoEquipamento: string;
  tipoServico: string;
  descricao: string;
  checklist: RespostaChecklist[];
  fotos: FotoDoRelatorio[];
  /** Fotos do serviço que não couberam no limite do PDF. */
  fotosOmitidas: number;
};

export type ProximaManutencao = {
  equipamento: string;
  local: string;
  /** Tipo do último serviço feito (ex.: "Preventiva"); "—" se nunca houve. */
  servico: string;
  dataPrevista: string;
  vencida: boolean;
};

export type DadosRelatorio = {
  prestador: string;
  cliente: { nome: string; cnpj: string | null };
  periodo: { inicio: string; fim: string };
  /** Data de emissão (yyyy-mm-dd). */
  emissao: string;
  /** Filtros opcionais em texto, para o cabeçalho ("Local: Bloco A"). */
  filtros: string[];
  resumo: {
    totalServicos: number;
    porTipoServico: { rotulo: string; total: number }[];
    porTipoEquipamento: { rotulo: string; total: number }[];
    equipamentosAtendidos: number;
    /** Equipamentos com manutenção vencida na data de emissão. */
    vencidas: number;
  };
  servicos: ServicoDoRelatorio[];
  proximas: ProximaManutencao[];
};

function contar(valores: string[]): { rotulo: string; total: number }[] {
  const mapa = new Map<string, number>();
  for (const v of valores) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  return [...mapa.entries()]
    .map(([rotulo, total]) => ({ rotulo, total }))
    .sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

/** Até 4 fotos: 2 de antes e 2 de depois primeiro; se faltar de um lado, completa com o outro. */
function escolherFotos<T extends { momento: "antes" | "depois" }>(lista: T[]): T[] {
  const antes = lista.filter((f) => f.momento === "antes");
  const depois = lista.filter((f) => f.momento === "depois");
  const escolhidas = [...antes.slice(0, MAX_FOTOS_NO_PDF / 2), ...depois.slice(0, MAX_FOTOS_NO_PDF / 2)];
  for (const f of [...antes.slice(MAX_FOTOS_NO_PDF / 2), ...depois.slice(MAX_FOTOS_NO_PDF / 2)]) {
    if (escolhidas.length >= MAX_FOTOS_NO_PDF) break;
    escolhidas.push(f);
  }
  return escolhidas.sort((a, b) => lista.indexOf(a) - lista.indexOf(b));
}

/**
 * Reúne tudo o que o PDF precisa. ⚠ Filtra SEMPRE por `escopo.clienteId`: o relatório nunca
 * mistura dados de clientes (os filtros de local/tipo/equipamento só estreitam o resultado).
 */
export async function montarDadosRelatorio(
  escopo: EscopoCliente,
  filtros: FiltrosRelatorio,
  prestador: string,
  hoje: Date = new Date(),
): Promise<DadosRelatorio | null> {
  const [cliente] = await db
    .select({ nome: clientes.nome, cnpj: clientes.cnpj })
    .from(clientes)
    .where(eq(clientes.id, escopo.clienteId))
    .limit(1);
  if (!cliente) return null;

  // ── Serviços do período ──
  const condicoes: SQL[] = [
    eq(locais.clienteId, escopo.clienteId),
    gte(servicos.data, filtros.inicio),
    lte(servicos.data, filtros.fim),
  ];
  if (filtros.localId) condicoes.push(eq(locais.id, filtros.localId));
  if (filtros.tipoId) condicoes.push(eq(equipamentos.tipoId, filtros.tipoId));
  if (filtros.equipamentoId) condicoes.push(eq(equipamentos.id, filtros.equipamentoId));

  const linhas = await db
    .select({
      id: servicos.id,
      equipamentoId: servicos.equipamentoId,
      data: servicos.data,
      tipo: servicos.tipo,
      descricao: servicos.descricao,
      checklist: servicos.checklist,
      equipamento: equipamentos.nome,
      local: locais.nome,
      tipoEquipamento: tiposEquipamento.nome,
    })
    .from(servicos)
    .innerJoin(equipamentos, eq(equipamentos.id, servicos.equipamentoId))
    .innerJoin(locais, eq(locais.id, equipamentos.localId))
    .innerJoin(tiposEquipamento, eq(tiposEquipamento.id, equipamentos.tipoId))
    .where(and(...condicoes))
    .orderBy(asc(servicos.data), asc(servicos.criadoEm));

  const idsServicos = linhas.map((l) => l.id);
  const listaFotos = idsServicos.length
    ? await db
        .select({ id: fotos.id, servicoId: fotos.servicoId, momento: fotos.momento })
        .from(fotos)
        .where(inArray(fotos.servicoId, idsServicos))
        .orderBy(asc(fotos.criadoEm))
    : [];

  const servicosRel: ServicoDoRelatorio[] = [];
  for (const l of linhas) {
    const doServico = listaFotos.filter((f) => f.servicoId === l.id);
    const escolhidas = escolherFotos(doServico);
    const imagens: FotoDoRelatorio[] = [];
    for (const f of escolhidas) {
      // Miniaturas lidas pela interface lib/storage (via lerMiniatura).
      const imagem = await lerMiniatura(l.id, f.id);
      if (imagem) imagens.push({ momento: f.momento, imagem });
    }
    servicosRel.push({
      id: l.id,
      data: l.data,
      equipamento: l.equipamento,
      local: l.local,
      tipoEquipamento: l.tipoEquipamento,
      tipoServico: ROTULOS_TIPO_SERVICO[l.tipo],
      descricao: l.descricao?.trim() ?? "",
      checklist: l.checklist,
      fotos: imagens,
      fotosOmitidas: Math.max(0, doServico.length - imagens.length),
    });
  }

  // ── Equipamentos do cliente (com os mesmos filtros): vencidas e próximas manutenções ──
  const condEquip: SQL[] = [eq(locais.clienteId, escopo.clienteId)];
  if (filtros.localId) condEquip.push(eq(locais.id, filtros.localId));
  if (filtros.tipoId) condEquip.push(eq(equipamentos.tipoId, filtros.tipoId));
  if (filtros.equipamentoId) condEquip.push(eq(equipamentos.id, filtros.equipamentoId));
  const equips = (await baseResumo().where(and(...condEquip)))
    .map(paraResumo)
    .filter((e) => !e.arquivado)
    .map((e) => ({ ...e, status: calcularStatus(e.proximaData, hoje) }));

  // Tipo do último serviço de cada equipamento (a coluna "Serviço" das próximas manutenções).
  const idsEquip = equips.filter((e) => e.proximaData).map((e) => e.id);
  const ultimosTipos = new Map<string, string>();
  if (idsEquip.length) {
    const todos = await db
      .select({ equipamentoId: servicos.equipamentoId, tipo: servicos.tipo, data: servicos.data, criadoEm: servicos.criadoEm })
      .from(servicos)
      .where(inArray(servicos.equipamentoId, idsEquip))
      .orderBy(asc(servicos.data), asc(servicos.criadoEm));
    for (const s of todos) ultimosTipos.set(s.equipamentoId, ROTULOS_TIPO_SERVICO[s.tipo]); // o último vence
  }

  const proximas: ProximaManutencao[] = equips
    .filter((e) => e.proximaData)
    .sort((a, b) => a.proximaData!.localeCompare(b.proximaData!) || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((e) => ({
      equipamento: e.nome,
      local: e.localNome,
      servico: ultimosTipos.get(e.id) ?? "—",
      dataPrevista: e.proximaData!,
      vencida: e.status === "vencido",
    }));

  // ── Texto dos filtros no cabeçalho ──
  const textos: string[] = [];
  if (filtros.localId) {
    const [l] = await db
      .select({ nome: locais.nome })
      .from(locais)
      .where(and(eq(locais.id, filtros.localId), eq(locais.clienteId, escopo.clienteId)))
      .limit(1);
    if (l) textos.push(`Local: ${l.nome}`);
  }
  if (filtros.tipoId) {
    const [t] = await db.select({ nome: tiposEquipamento.nome }).from(tiposEquipamento).where(eq(tiposEquipamento.id, filtros.tipoId)).limit(1);
    if (t) textos.push(`Tipo de equipamento: ${t.nome}`);
  }
  if (filtros.equipamentoId) {
    const e = equips.find((x) => x.id === filtros.equipamentoId) ?? linhas.find((x) => x.equipamentoId === filtros.equipamentoId);
    const nome = e ? ("nome" in e ? e.nome : e.equipamento) : null;
    if (nome) textos.push(`Equipamento: ${nome}`);
  }

  const dia = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return {
    prestador,
    cliente,
    periodo: { inicio: filtros.inicio, fim: filtros.fim },
    emissao: dia(hoje),
    filtros: textos,
    resumo: {
      totalServicos: servicosRel.length,
      porTipoServico: contar(servicosRel.map((s) => s.tipoServico)),
      porTipoEquipamento: contar(servicosRel.map((s) => s.tipoEquipamento)),
      equipamentosAtendidos: new Set(linhas.map((l) => l.equipamentoId)).size,
      vencidas: equips.filter((e) => e.status === "vencido").length,
    },
    servicos: servicosRel,
    proximas,
  };
}
