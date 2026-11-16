import Dexie, { type Table } from "dexie";
import type { MomentoFoto } from "@/db/schema";
import type { ClienteDTO, NovoServico, ServicoDetalhe, TipoEquipamentoDTO } from "./types";
import type { EquipamentoSincronizado } from "@/lib/tecnico/sync/tipos";

/**
 * Banco local do técnico (IndexedDB, via Dexie). É daqui que as telas leem (lib/tecnico/data) e é
 * aqui que os serviços registrados sem internet esperam o envio.
 */

export type RegistroMeta = { chave: string; valor: unknown };

/** Serviço registrado no celular e ainda não confirmado pelo servidor. */
export type ItemFilaServico = {
  /** O mesmo UUID do serviço (gerado no celular): é a chave de idempotência no servidor. */
  id: string;
  equipamentoId: string;
  /** Quando entrou na fila (ms). A fila é enviada na ordem de entrada. */
  criadoEm: number;
  dados: NovoServico & { fotos: { id: string; momento: MomentoFoto }[] };
  tentativas: number;
  /** Só tenta de novo depois deste instante (ms). `0` = já pode. */
  proximaTentativa: number;
  erro: string | null;
  /** O servidor recusou de vez: fica na fila, visível, até a pessoa tentar de novo. */
  recusado: boolean;
};

export type ItemFilaFoto = {
  /** UUID da foto (gerado quando ela é escolhida): idempotência no servidor. */
  id: string;
  servicoId: string;
  momento: MomentoFoto;
  /** Foto já comprimida. */
  arquivo: Blob;
  /** 1 = o servidor confirmou o recebimento (booleano não indexa no IndexedDB). */
  enviada: 0 | 1;
};

export class BancoLocal extends Dexie {
  meta!: Table<RegistroMeta, string>;
  clientes!: Table<ClienteDTO, string>;
  tipos!: Table<TipoEquipamentoDTO, string>;
  equipamentos!: Table<EquipamentoSincronizado, string>;
  /** Últimos serviços de cada equipamento (os 10 mais recentes, como vêm do servidor). */
  servicos!: Table<ServicoDetalhe, string>;
  filaServicos!: Table<ItemFilaServico, string>;
  filaFotos!: Table<ItemFilaFoto, string>;

  constructor(nome = "controle-manutencoes") {
    super(nome);
    this.version(1).stores({
      meta: "chave",
      clientes: "id",
      tipos: "id",
      equipamentos: "id, localId, tipoId",
      servicos: "id, equipamentoId, data, criadoEm",
      filaServicos: "id, criadoEm, equipamentoId",
      filaFotos: "id, servicoId, enviada",
    });
  }
}

let instancia: BancoLocal | null = null;

/** O banco do app (criado só no navegador, na primeira vez que alguém o usa). */
export function banco(): BancoLocal {
  instancia ??= new BancoLocal();
  return instancia;
}

/** Só para testes: troca o banco por um novo (com fake-indexeddb). */
export function trocarBancoParaTeste(novo: BancoLocal | null) {
  instancia = novo;
}

// ───────────────────────── meta ─────────────────────────

export const META = {
  /** ISO do "agora" do servidor na última sincronização completa bem-sucedida (pull). */
  ultimoPull: "ultimoPull",
  /** ISO de quando o app terminou a última sincronização (para o texto "Última sincronização"). */
  ultimaSincronizacao: "ultimaSincronizacao",
  usuario: "usuario",
} as const;

export async function lerMeta<T>(chave: string): Promise<T | undefined> {
  return (await banco().meta.get(chave))?.valor as T | undefined;
}

export async function gravarMeta(chave: string, valor: unknown): Promise<void> {
  await banco().meta.put({ chave, valor });
}

/** Apaga os dados baixados do servidor (ao sair). NÃO mexe na fila: serviços pendentes não podem se perder. */
export async function limparDadosBaixados(): Promise<void> {
  const b = banco();
  await b.transaction("rw", [b.meta, b.clientes, b.tipos, b.equipamentos, b.servicos], async () => {
    await Promise.all([b.meta.clear(), b.clientes.clear(), b.tipos.clear(), b.equipamentos.clear(), b.servicos.clear()]);
  });
}
