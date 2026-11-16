import { calcularStatus, ultimoServico, type ServicoParaStatus } from "@/lib/status";
import type { EquipamentoSincronizado } from "@/lib/tecnico/sync/tipos";
import type { ItemFilaFoto, ItemFilaServico } from "./banco";
import type { EquipamentoResumo, ServicoDetalhe } from "./types";

/**
 * Regras puras de como os serviços AGUARDANDO ENVIO (fila local) entram nas telas:
 * já contam no status do equipamento e já aparecem na linha do tempo, com o selo "Aguardando envio".
 */

// Endereços locais (blob:) das fotos pendentes — um por foto, reaproveitado entre as telas.
const urlsLocais = new Map<string, string>();

export function urlLocalDaFoto(id: string, arquivo: Blob): string {
  let url = urlsLocais.get(id);
  if (!url) {
    url = URL.createObjectURL(arquivo);
    urlsLocais.set(id, url);
  }
  return url;
}

export function liberarUrlLocalDaFoto(id: string): void {
  const url = urlsLocais.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlsLocais.delete(id);
  }
}

/**
 * Último serviço do equipamento considerando o que veio do servidor E a fila pendente.
 * Empate de data: vale o criado por último (a fila é sempre mais nova que o que o servidor mandou).
 */
export function ultimoComPendentes(
  e: Pick<EquipamentoSincronizado, "ultimoServicoEm" | "proximaData">,
  pendentes: ItemFilaServico[],
): { ultimoServicoEm: string | null; proximaData: string | null } {
  const candidatos: ServicoParaStatus[] = pendentes.map((p) => ({
    data: p.dados.data,
    proximaData: p.dados.proximaData ?? null,
    criadoEm: new Date(p.criadoEm),
  }));
  if (e.ultimoServicoEm) {
    candidatos.push({ data: e.ultimoServicoEm, proximaData: e.proximaData, criadoEm: new Date(0) });
  }
  const ultimo = ultimoServico(candidatos);
  return ultimo
    ? { ultimoServicoEm: ultimo.data, proximaData: ultimo.proximaData }
    : { ultimoServicoEm: null, proximaData: null };
}

/** Resumo do equipamento para listas e painel, com o status já contando a fila. */
export function resumoDoEquipamento(e: EquipamentoSincronizado, pendentes: ItemFilaServico[], hoje = new Date()): EquipamentoResumo {
  const { ultimoServicoEm, proximaData } = ultimoComPendentes(e, pendentes);
  return {
    id: e.id,
    nome: e.nome,
    tipoId: e.tipoId,
    tipoNome: e.tipoNome,
    tipoIcone: e.tipoIcone,
    localId: e.localId,
    localNome: e.localNome,
    clienteId: e.clienteId,
    periodicidadeDias: e.periodicidadeDias,
    arquivado: e.arquivado,
    ultimoServicoEm,
    proximaData,
    status: calcularStatus(proximaData, hoje),
  };
}

/** Serviço da fila no formato da linha do tempo. */
export function servicoPendenteParaDetalhe(
  item: ItemFilaServico,
  fotos: ItemFilaFoto[],
  nomeDoUsuario: string | null,
): ServicoDetalhe {
  return {
    id: item.id,
    equipamentoId: item.dados.equipamentoId,
    tipo: item.dados.tipo,
    data: item.dados.data,
    descricao: item.dados.descricao,
    checklist: item.dados.checklist,
    proximaData: item.dados.proximaData ?? null,
    criadoPor: null,
    criadoPorNome: nomeDoUsuario,
    criadoEm: new Date(item.criadoEm).toISOString(),
    pendente: true,
    fotos: item.dados.fotos.flatMap((f) => {
      const foto = fotos.find((x) => x.id === f.id);
      return foto ? [{ id: f.id, momento: f.momento, largura: null, altura: null, url: urlLocalDaFoto(f.id, foto.arquivo) }] : [];
    }),
  };
}

/** Une os serviços do servidor com os pendentes (sem repetir) do mais novo para o mais antigo. */
export function mesclarServicos(doServidor: ServicoDetalhe[], pendentes: ServicoDetalhe[]): ServicoDetalhe[] {
  const ids = new Set(doServidor.map((s) => s.id));
  return [...doServidor, ...pendentes.filter((p) => !ids.has(p.id))].sort(
    (a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm),
  );
}
