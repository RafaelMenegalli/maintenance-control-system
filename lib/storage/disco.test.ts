import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ArmazenamentoDisco, chaveFoto, chaveMiniatura } from "./disco";

const SERVICO = "3f2c1a10-1111-4222-8333-444455556666";
const FOTO = "9a8b7c6d-aaaa-4bbb-8ccc-ddddeeeeffff";

let pasta: string;
let disco: ArmazenamentoDisco;

beforeAll(async () => {
  pasta = await mkdtemp(path.join(tmpdir(), "manutencoes-"));
  disco = new ArmazenamentoDisco(pasta);
});
afterAll(async () => {
  await rm(pasta, { recursive: true, force: true });
});

describe("chaves", () => {
  it("montam o caminho servicos/{servicoId}/{fotoId}.jpg", () => {
    expect(chaveFoto(SERVICO, FOTO)).toBe(`servicos/${SERVICO}/${FOTO}.jpg`);
    expect(chaveMiniatura(SERVICO, FOTO)).toBe(`servicos/${SERVICO}/miniaturas/${FOTO}.jpg`);
  });

  it("recusam qualquer coisa que não seja UUID (path traversal)", () => {
    expect(() => chaveFoto("../../etc", FOTO)).toThrow();
    expect(() => chaveFoto(SERVICO, "../../../senha")).toThrow();
    expect(() => chaveFoto(SERVICO, `${FOTO}/../x`)).toThrow();
    expect(() => chaveMiniatura("", FOTO)).toThrow();
  });
});

describe("ArmazenamentoDisco", () => {
  it("salva (criando as subpastas), lê, confere existência e remove", async () => {
    const chave = chaveFoto(SERVICO, FOTO);
    expect(await disco.existe(chave)).toBe(false);
    expect(await disco.ler(chave)).toBeNull();

    await disco.salvar(chave, Buffer.from("conteudo"));
    expect(await disco.existe(chave)).toBe(true);
    expect((await disco.ler(chave))?.toString()).toBe("conteudo");
    expect((await disco.lerStream(chave))?.tamanho).toBe(8);

    await disco.remover(chave);
    expect(await disco.existe(chave)).toBe(false);
    await expect(disco.remover(chave)).resolves.toBeUndefined();
  });

  it("não deixa sair da pasta base, mesmo com chave maliciosa", async () => {
    await expect(disco.salvar("../fora.txt", Buffer.from("x"))).rejects.toThrow();
    await expect(disco.ler("../../fora.txt")).rejects.toThrow();
    await expect(disco.existe("servicos/../../fora.txt")).rejects.toThrow();
    await expect(disco.remover("/etc/passwd")).rejects.toThrow();
  });
});
