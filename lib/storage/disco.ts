import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Armazenamento de arquivos (fotos) — interface ÚNICA (docs/ESCOPO.md, seção 7).
 * Todo acesso a arquivos passa por aqui; para trocar por um storage externo, só este arquivo muda.
 *
 * Hoje: disco local, na pasta `UPLOAD_DIR` (fora de hbuilds/ e public_html/ na Hostinger).
 * Estrutura: {UPLOAD_DIR}/servicos/{servicoId}/{fotoId}.jpg
 *
 * SEGURANÇA: as chaves são montadas SÓ por `chaveFoto`/`chaveMiniatura`, a partir de UUIDs
 * validados — nunca de texto livre vindo do usuário. Mesmo assim, o caminho final é conferido
 * para nunca sair de `UPLOAD_DIR` (proteção contra path traversal).
 */
export interface Armazenamento {
  /** Grava (ou sobrescreve) o arquivo. Cria as subpastas automaticamente. */
  salvar(chave: string, dados: Buffer): Promise<void>;
  /** Lê o arquivo inteiro. Devolve `null` se não existir. */
  ler(chave: string): Promise<Buffer | null>;
  /** Abre o arquivo como stream (para responder sem carregar tudo na memória). `null` se não existir. */
  lerStream(chave: string): Promise<{ stream: ReadableStream<Uint8Array>; tamanho: number } | null>;
  existe(chave: string): Promise<boolean>;
  /** Apaga o arquivo. Não dá erro se ele já não existir. */
  remover(chave: string): Promise<void>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function exigirUuid(valor: string, nome: string): string {
  if (!UUID.test(valor)) throw new Error(`${nome} inválido`);
  return valor.toLowerCase();
}

/** servicos/{servicoId}/{fotoId}.jpg */
export function chaveFoto(servicoId: string, fotoId: string): string {
  return `servicos/${exigirUuid(servicoId, "servicoId")}/${exigirUuid(fotoId, "fotoId")}.jpg`;
}

/** servicos/{servicoId}/miniaturas/{fotoId}.jpg */
export function chaveMiniatura(servicoId: string, fotoId: string): string {
  return `servicos/${exigirUuid(servicoId, "servicoId")}/miniaturas/${exigirUuid(fotoId, "fotoId")}.jpg`;
}

export class ArmazenamentoDisco implements Armazenamento {
  private readonly base: string;

  constructor(pasta: string) {
    // turbopackIgnore: o caminho é dinâmico (UPLOAD_DIR) e não deve entrar no rastreamento do build.
    this.base = path.resolve(/* turbopackIgnore: true */ process.cwd(), pasta);
  }

  /** Caminho absoluto da chave, garantindo que fica dentro da pasta base. */
  private caminho(chave: string): string {
    const alvo = path.resolve(this.base, chave);
    if (alvo !== this.base && !alvo.startsWith(this.base + path.sep)) {
      throw new Error("Caminho de arquivo inválido");
    }
    return alvo;
  }

  async salvar(chave: string, dados: Buffer) {
    const alvo = this.caminho(chave);
    await mkdir(path.dirname(alvo), { recursive: true });
    await writeFile(alvo, dados);
  }

  async ler(chave: string) {
    try {
      return await readFile(this.caminho(chave));
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw erro;
    }
  }

  async lerStream(chave: string) {
    const alvo = this.caminho(chave);
    try {
      const info = await stat(alvo);
      if (!info.isFile()) return null;
      return {
        stream: Readable.toWeb(createReadStream(alvo)) as ReadableStream<Uint8Array>,
        tamanho: info.size,
      };
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw erro;
    }
  }

  async existe(chave: string) {
    try {
      return (await stat(this.caminho(chave))).isFile();
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw erro;
    }
  }

  async remover(chave: string) {
    await rm(this.caminho(chave), { force: true });
  }
}
