import { calcularStatus } from "@/lib/status";
import { filtrarEquipamentos, montarPainel } from "./filtros";
import { notificarMudanca } from "./invalidacao";
import type { RepositorioTecnico } from "./repositorio";
import type {
  ClienteDTO,
  EquipamentoDetalhe,
  EquipamentoResumo,
  LocalDTO,
  ServicoDetalhe,
  TipoEquipamentoDetalhe,
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

async function requisitar(url: string, init?: RequestInit): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    });
  } catch {
    throw new ErroDeDados("Sem internet. Conecte-se e tente de novo.", 0);
  }
  return resposta;
}

async function mensagemDaResposta(resposta: Response, padrao: string): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { erro?: string };
    return corpo.erro ?? padrao;
  } catch {
    return padrao;
  }
}

async function ler<T>(url: string): Promise<T | null> {
  const resposta = await requisitar(url);
  if (resposta.status === 404) return null;
  if (resposta.status === 401 || resposta.status === 403) {
    throw new ErroDeDados("Sua sessão terminou. Entre de novo.", resposta.status);
  }
  if (!resposta.ok) {
    throw new ErroDeDados(
      await mensagemDaResposta(resposta, "Não foi possível carregar os dados. Tente de novo."),
      resposta.status,
    );
  }
  return (await resposta.json()) as T;
}

async function escrever<T = unknown>(metodo: "POST" | "PATCH" | "DELETE", url: string, corpo?: unknown): Promise<T> {
  const resposta = await requisitar(url, {
    method: metodo,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (resposta.status === 401 || resposta.status === 403) {
    throw new ErroDeDados("Sua sessão terminou. Entre de novo.", resposta.status);
  }
  if (!resposta.ok) {
    throw new ErroDeDados(
      await mensagemDaResposta(resposta, "Não foi possível salvar. Tente de novo."),
      resposta.status,
    );
  }
  notificarMudanca();
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
    const lista = (await ler<EquipamentoDaApi[]>("/api/tecnico/equipamentos")) ?? [];
    return filtrarEquipamentos(lista.map(comStatus), filtros);
  },

  async obterEquipamento(id) {
    const e = await ler<Omit<EquipamentoDetalhe, "status">>(`/api/tecnico/equipamentos/${encodeURIComponent(id)}`);
    return e ? comStatus(e) : null;
  },

  async listarServicos(equipamentoId, opcoes) {
    const servicos =
      (await ler<ServicoDetalhe[]>(`/api/tecnico/equipamentos/${encodeURIComponent(equipamentoId)}/servicos`)) ?? [];
    return opcoes?.limite ? servicos.slice(0, opcoes.limite) : servicos;
  },

  async listarTipos() {
    return (await ler<TipoEquipamentoDTO[]>("/api/tecnico/tipos")) ?? [];
  },

  obterTipo(id) {
    return ler<TipoEquipamentoDetalhe>(`/api/tecnico/tipos/${encodeURIComponent(id)}`);
  },

  async listarLocais() {
    return (await ler<LocalDTO[]>("/api/tecnico/locais")) ?? [];
  },

  async listarClientes() {
    return (await ler<ClienteDTO[]>("/api/tecnico/clientes")) ?? [];
  },

  async obterPainel() {
    const lista = (await ler<EquipamentoDaApi[]>("/api/tecnico/equipamentos")) ?? [];
    return montarPainel(lista.map(comStatus));
  },

  async salvarCliente(dados) {
    const { id } = await escrever<{ id: string }>("POST", "/api/tecnico/clientes", dados);
    return { id };
  },

  async salvarLocal(dados) {
    const { id } = await escrever<{ id: string }>("POST", "/api/tecnico/locais", dados);
    return { id };
  },

  async excluirLocal(id) {
    await escrever("DELETE", `/api/tecnico/locais/${encodeURIComponent(id)}`);
  },

  async salvarTipo(dados) {
    const { id } = await escrever<{ id: string }>("POST", "/api/tecnico/tipos", dados);
    return { id };
  },

  async definirTipoAtivo(id, ativo) {
    await escrever("PATCH", `/api/tecnico/tipos/${encodeURIComponent(id)}`, { ativo });
  },

  async excluirTipo(id) {
    await escrever("DELETE", `/api/tecnico/tipos/${encodeURIComponent(id)}`);
  },

  async salvarEquipamento(dados) {
    const { id } = await escrever<{ id: string }>("POST", "/api/tecnico/equipamentos", dados);
    return { id };
  },

  async arquivarEquipamento(id, arquivar) {
    await escrever("PATCH", `/api/tecnico/equipamentos/${encodeURIComponent(id)}`, { arquivado: arquivar });
  },
};
