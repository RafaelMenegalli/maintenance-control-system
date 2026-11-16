import { calcularStatus } from "@/lib/status";
import { filtrarEquipamentos, montarPainel } from "./filtros";
import { notificarMudanca } from "./invalidacao";
import type { RepositorioTecnico } from "./repositorio";
import type {
  ClienteDTO,
  EquipamentoDetalhe,
  FotoParaEnviar,
  ProgressoEnvio,
  ServicoRecente,
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

async function escrever<T = unknown>(metodo: "POST" | "PUT" | "PATCH" | "DELETE", url: string, corpo?: unknown): Promise<T> {
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

/** Envia uma foto (multipart) com progresso do upload. Idempotente no servidor pelo id da foto. */
function enviarFoto(servicoId: string, foto: FotoParaEnviar, aoProgresso: (fracao: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/fotos");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgresso(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let mensagem = "Não foi possível enviar a foto.";
      try {
        mensagem = (JSON.parse(xhr.responseText) as { erro?: string }).erro ?? mensagem;
      } catch {
        /* mantém a mensagem padrão */
      }
      reject(new ErroDeDados(mensagem, xhr.status));
    };
    xhr.onerror = () => reject(new ErroDeDados("Sem internet. Conecte-se e tente de novo.", 0));
    const form = new FormData();
    form.append("fotoId", foto.id);
    form.append("servicoId", servicoId);
    form.append("momento", foto.momento);
    form.append("arquivo", foto.arquivo, `${foto.id}.jpg`);
    xhr.send(form);
  });
}

/** Envia as fotos em sequência, avisando o andamento. Devolve quando todas foram recebidas. */
async function enviarFotos(
  servicoId: string,
  fotos: FotoParaEnviar[],
  aoProgredir?: (p: ProgressoEnvio) => void,
) {
  const total = fotos.length;
  const unidades = total + 1; // as fotos + o serviço
  aoProgredir?.({ etapa: "fotos", fotosEnviadas: 0, totalFotos: total, percentual: 0 });
  for (let i = 0; i < total; i++) {
    try {
      await enviarFoto(servicoId, fotos[i], (fracao) =>
        aoProgredir?.({
          etapa: "fotos",
          fotosEnviadas: i,
          totalFotos: total,
          percentual: Math.round(((i + fracao) / unidades) * 100),
        }),
      );
    } catch (e) {
      const motivo = e instanceof Error ? e.message : "Erro desconhecido.";
      throw new ErroDeDados(`Não foi possível enviar a foto ${i + 1} de ${total}. ${motivo}`, e instanceof ErroDeDados ? e.status : 0);
    }
    aoProgredir?.({ etapa: "fotos", fotosEnviadas: i + 1, totalFotos: total, percentual: Math.round(((i + 1) / unidades) * 100) });
  }
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
  async listarServicosRecentes(limite = 10) {
    return (await ler<ServicoRecente[]>(`/api/tecnico/servicos/recentes?limite=${limite}`)) ?? [];
  },

  async salvarServico(dados, fotos, aoProgredir) {
    // 1) fotos (idempotentes pelo id da foto)  2) serviço (idempotente pelo id do serviço)
    await enviarFotos(dados.id, fotos, aoProgredir);
    aoProgredir?.({ etapa: "servico", fotosEnviadas: fotos.length, totalFotos: fotos.length, percentual: 95 });
    await escrever("POST", "/api/tecnico/servicos", {
      ...dados,
      fotos: fotos.map((f) => ({ id: f.id, momento: f.momento })),
    });
    aoProgredir?.({ etapa: "servico", fotosEnviadas: fotos.length, totalFotos: fotos.length, percentual: 100 });
    return { id: dados.id };
  },

  async editarServico(id, dados, fotosNovas, fotosRemovidas, aoProgredir) {
    await enviarFotos(id, fotosNovas, aoProgredir);
    await escrever("PUT", `/api/tecnico/servicos/${encodeURIComponent(id)}`, {
      ...dados,
      fotosNovas: fotosNovas.map((f) => ({ id: f.id, momento: f.momento })),
      fotosRemovidas,
    });
    aoProgredir?.({ etapa: "servico", fotosEnviadas: fotosNovas.length, totalFotos: fotosNovas.length, percentual: 100 });
  },

  async excluirServico(id) {
    await escrever("DELETE", `/api/tecnico/servicos/${encodeURIComponent(id)}`);
  },
};
