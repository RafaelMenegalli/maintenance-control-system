import { calcularStatus } from "@/lib/status";
import { filtrarEquipamentos, montarPainel } from "./filtros";
import type { RepositorioTecnico } from "./repositorio";
import type {
  EquipamentoDetalhe,
  EquipamentoResumo,
  LocalDTO,
  ServicoDetalhe,
  TipoEquipamentoDTO,
} from "./types";

/** Erro de rede ou da API, com mensagem pronta para mostrar ao usuário. */
export class ErroDeDados extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
    this.name = "ErroDeDados";
  }
}

async function buscar<T>(url: string): Promise<T | null> {
  let resposta: Response;
  try {
    resposta = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new ErroDeDados("Sem internet. Conecte-se para carregar esta tela.", 0);
  }
  if (resposta.status === 404) return null;
  if (resposta.status === 401 || resposta.status === 403) {
    throw new ErroDeDados("Sua sessão terminou. Entre de novo.", resposta.status);
  }
  if (!resposta.ok) {
    throw new ErroDeDados("Não foi possível carregar os dados. Tente de novo.", resposta.status);
  }
  return (await resposta.json()) as T;
}

/** A API devolve `status` ausente: ele é calculado aqui, igual será na versão offline. */
type EquipamentoDaApi = Omit<EquipamentoResumo, "status">;

function comStatus<T extends EquipamentoDaApi>(e: T): T & { status: EquipamentoResumo["status"] } {
  return { ...e, status: calcularStatus(e.proximaData) };
}

/** Implementação atual: route handlers em /api/tecnico/*. */
export const fetchRepositorio: RepositorioTecnico = {
  async listarEquipamentos(filtros) {
    const lista = (await buscar<EquipamentoDaApi[]>("/api/tecnico/equipamentos")) ?? [];
    return filtrarEquipamentos(lista.map(comStatus), filtros);
  },

  async obterEquipamento(id) {
    const e = await buscar<Omit<EquipamentoDetalhe, "status">>(
      `/api/tecnico/equipamentos/${encodeURIComponent(id)}`,
    );
    return e ? comStatus(e) : null;
  },

  async listarServicos(equipamentoId, opcoes) {
    const servicos =
      (await buscar<ServicoDetalhe[]>(
        `/api/tecnico/equipamentos/${encodeURIComponent(equipamentoId)}/servicos`,
      )) ?? [];
    return opcoes?.limite ? servicos.slice(0, opcoes.limite) : servicos;
  },

  async listarTipos() {
    return (await buscar<TipoEquipamentoDTO[]>("/api/tecnico/tipos")) ?? [];
  },

  async listarLocais() {
    return (await buscar<LocalDTO[]>("/api/tecnico/locais")) ?? [];
  },

  async obterPainel() {
    const lista = (await buscar<EquipamentoDaApi[]>("/api/tecnico/equipamentos")) ?? [];
    return montarPainel(lista.map(comStatus));
  },
};
