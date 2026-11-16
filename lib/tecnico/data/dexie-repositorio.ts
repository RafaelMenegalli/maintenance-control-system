import { notificarMudanca } from "./invalidacao";
import { agendarSincronizacao, puxarAgora } from "@/lib/tecnico/sync/motor";
import { banco, lerMeta, META, type ItemFilaServico } from "./banco";
import { fetchRepositorio } from "./fetch-repositorio";
import { filtrarEquipamentos, montarPainel } from "./filtros";
import { mesclarServicos, resumoDoEquipamento, servicoPendenteParaDetalhe } from "./pendentes";
import type { RepositorioTecnico } from "./repositorio";
import type {
  ClienteDTO,
  EquipamentoDetalhe,
  EquipamentoResumo,
  LocalDTO,
  ServicoDetalhe,
  ServicoRecente,
  TipoEquipamentoDetalhe,
  TipoEquipamentoDTO,
} from "./types";

/**
 * Implementação OFFLINE da camada de dados do técnico: lê do Dexie (IndexedDB) e grava serviços na fila local;
 * o motor em lib/tecnico/sync envia depois. As telas não sabem a diferença (mesma interface de ./repositorio).
 *
 * - Leituras: sempre do Dexie; o status dos equipamentos já conta os serviços aguardando envio.
 * - `salvarServico`: grava na fila (com as fotos já comprimidas) e dispara a sincronização. Funciona sem internet.
 * - Cadastros, edição e exclusão de serviços: continuam exigindo internet (vão pela API); depois de gravar,
 *   baixam as novidades para o Dexie ficar igual ao servidor.
 */

/** A primeira sincronização ainda não aconteceu: não há o que mostrar. */
export class SemDadosLocais extends Error {
  constructor() {
    super("Ainda não há dados no celular. Conecte-se à internet uma vez para baixar os dados do sistema.");
    this.name = "SemDadosLocais";
  }
}

async function exigirDados(): Promise<void> {
  if (!(await lerMeta<string>(META.ultimoPull))) throw new SemDadosLocais();
}

async function filaDoEquipamento(): Promise<Map<string, ItemFilaServico[]>> {
  const mapa = new Map<string, ItemFilaServico[]>();
  for (const item of await banco().filaServicos.toArray()) {
    const lista = mapa.get(item.equipamentoId) ?? [];
    lista.push(item);
    mapa.set(item.equipamentoId, lista);
  }
  return mapa;
}

async function todosOsResumos(): Promise<EquipamentoResumo[]> {
  await exigirDados();
  const [lista, fila] = await Promise.all([banco().equipamentos.toArray(), filaDoEquipamento()]);
  return lista.map((e) => resumoDoEquipamento(e, fila.get(e.id) ?? []));
}

/** Escreve online (pela API) e depois baixa as novidades para o Dexie refletir a mudança. */
async function viaApi<T>(escrita: () => Promise<T>): Promise<T> {
  const resultado = await escrita();
  try {
    await puxarAgora();
  } catch {
    /* a gravação deu certo; a tela atualiza no próximo pull */
  }
  notificarMudanca();
  return resultado;
}

async function nomeDoUsuario(): Promise<string | null> {
  return (await lerMeta<{ nome?: string }>(META.usuario))?.nome ?? null;
}

async function servicosDoEquipamento(equipamentoId: string): Promise<ServicoDetalhe[]> {
  const b = banco();
  const [doServidor, fila] = await Promise.all([
    b.servicos.where("equipamentoId").equals(equipamentoId).toArray(),
    b.filaServicos.where("equipamentoId").equals(equipamentoId).toArray(),
  ]);
  const nome = await nomeDoUsuario();
  const pendentes: ServicoDetalhe[] = [];
  for (const item of fila) {
    const fotos = await b.filaFotos.where("servicoId").equals(item.id).toArray();
    pendentes.push(servicoPendenteParaDetalhe(item, fotos, nome));
  }
  return mesclarServicos(doServidor, pendentes);
}

export const dexieRepositorio: RepositorioTecnico = {
  // ───────────── Leitura ─────────────
  async listarEquipamentos(filtros) {
    return filtrarEquipamentos(await todosOsResumos(), filtros);
  },

  async obterEquipamento(id) {
    await exigirDados();
    const b = banco();
    const e = await b.equipamentos.get(id);
    if (!e) return null;
    const fila = await b.filaServicos.where("equipamentoId").equals(id).toArray();
    const resumo = resumoDoEquipamento(e, fila);
    const detalhe: EquipamentoDetalhe = {
      ...resumo,
      atributos: e.atributos,
      observacoes: e.observacoes,
      campos: e.campos,
      checklist: e.checklist,
      criadoEm: e.criadoEm,
      atualizadoEm: e.atualizadoEm,
    };
    return detalhe;
  },

  async listarServicos(equipamentoId, opcoes) {
    await exigirDados();
    const lista = await servicosDoEquipamento(equipamentoId);
    return opcoes?.limite ? lista.slice(0, opcoes.limite) : lista;
  },

  async listarTipos() {
    await exigirDados();
    const b = banco();
    const [tipos, equipamentos] = await Promise.all([b.tipos.toArray(), b.equipamentos.toArray()]);
    return tipos
      .map((t): TipoEquipamentoDTO => ({ ...t, quantidadeEquipamentos: equipamentos.filter((e) => e.tipoId === t.id).length }))
      .sort((a, b2) => a.nome.localeCompare(b2.nome, "pt-BR"));
  },

  async obterTipo(id) {
    await exigirDados();
    const b = banco();
    const tipo = await b.tipos.get(id);
    if (!tipo) return null;
    const doTipo = await b.equipamentos.where("tipoId").equals(id).toArray();
    const usoCampos: Record<string, number> = {};
    for (const campo of tipo.campos) {
      usoCampos[campo.key] = doTipo.filter((e) => {
        const v = e.atributos[campo.key];
        return v !== undefined && v !== null && v !== "";
      }).length;
    }
    const detalhe: TipoEquipamentoDetalhe = { ...tipo, quantidadeEquipamentos: doTipo.length, usoCampos };
    return detalhe;
  },

  async listarLocais() {
    const clientes = await dexieRepositorio.listarClientes();
    return clientes.flatMap((c) => c.locais);
  },

  async listarClientes() {
    await exigirDados();
    const b = banco();
    const [clientes, equipamentos] = await Promise.all([b.clientes.toArray(), b.equipamentos.toArray()]);
    return clientes
      .map((c): ClienteDTO => ({
        ...c,
        locais: c.locais
          .map((l): LocalDTO => ({ ...l, quantidadeEquipamentos: equipamentos.filter((e) => e.localId === l.id).length }))
          .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR")),
      }))
      .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
  },

  async listarServicosRecentes(limite = 10) {
    await exigirDados();
    const b = banco();
    const [equipamentos, doServidor, fila] = await Promise.all([
      b.equipamentos.toArray(),
      b.servicos.toArray(),
      b.filaServicos.toArray(),
    ]);
    const porId = new Map(equipamentos.map((e) => [e.id, e]));
    const nome = await nomeDoUsuario();
    const pendentes: ServicoDetalhe[] = fila.map((i) => servicoPendenteParaDetalhe(i, [], nome));
    const todos = mesclarServicos(doServidor, pendentes).sort((x, y) => y.criadoEm.localeCompare(x.criadoEm));
    const recentes: ServicoRecente[] = [];
    for (const s of todos) {
      const e = porId.get(s.equipamentoId);
      if (!e) continue;
      recentes.push({
        id: s.id,
        data: s.data,
        tipo: s.tipo,
        criadoEm: s.criadoEm,
        equipamentoId: e.id,
        equipamentoNome: e.nome,
        localNome: e.localNome,
        tipoEquipamentoNome: e.tipoNome,
        tipoEquipamentoIcone: e.tipoIcone,
        criadoPorNome: s.criadoPorNome,
      });
      if (recentes.length >= limite) break;
    }
    return recentes;
  },

  async obterPainel() {
    return montarPainel(await todosOsResumos());
  },

  // ───────────── Cadastros (precisam de internet) ─────────────
  salvarCliente: (dados) => viaApi(() => fetchRepositorio.salvarCliente(dados)),
  salvarLocal: (dados) => viaApi(() => fetchRepositorio.salvarLocal(dados)),
  excluirLocal: (id) => viaApi(() => fetchRepositorio.excluirLocal(id)),
  salvarTipo: (dados) => viaApi(() => fetchRepositorio.salvarTipo(dados)),
  definirTipoAtivo: (id, ativo) => viaApi(() => fetchRepositorio.definirTipoAtivo(id, ativo)),
  excluirTipo: (id) => viaApi(() => fetchRepositorio.excluirTipo(id)),
  salvarEquipamento: (dados) => viaApi(() => fetchRepositorio.salvarEquipamento(dados)),
  arquivarEquipamento: (id, arquivar) => viaApi(() => fetchRepositorio.arquivarEquipamento(id, arquivar)),

  // ───────────── Serviços ─────────────
  /**
   * Guarda o serviço e as fotos (já comprimidas) na fila local e dispara o envio. Volta na hora — com ou sem
   * internet. IDEMPOTENTE: salvar duas vezes o mesmo `id` (duplo toque) não cria dois.
   */
  async salvarServico(dados, fotos, aoProgredir) {
    const b = banco();
    const item: ItemFilaServico = {
      id: dados.id,
      equipamentoId: dados.equipamentoId,
      criadoEm: Date.now(),
      dados: { ...dados, fotos: fotos.map((f) => ({ id: f.id, momento: f.momento })) },
      tentativas: 0,
      proximaTentativa: 0,
      erro: null,
      recusado: false,
    };
    await b.transaction("rw", [b.filaServicos, b.filaFotos], async () => {
      if (await b.filaServicos.get(item.id)) return; // já está na fila
      await b.filaServicos.add(item);
      await b.filaFotos.bulkPut(
        fotos.map((f) => ({ id: f.id, servicoId: dados.id, momento: f.momento, arquivo: f.arquivo, enviada: 0 as const })),
      );
    });
    aoProgredir?.({ etapa: "servico", fotosEnviadas: fotos.length, totalFotos: fotos.length, percentual: 100 });
    notificarMudanca();
    agendarSincronizacao();
    return { id: dados.id };
  },

  // Edição e exclusão de serviços já enviados: só online.
  editarServico: (id, dados, fotosNovas, fotosRemovidas, aoProgredir) =>
    viaApi(() => fetchRepositorio.editarServico(id, dados, fotosNovas, fotosRemovidas, aoProgredir)),
  excluirServico: (id) => viaApi(() => fetchRepositorio.excluirServico(id)),
};
