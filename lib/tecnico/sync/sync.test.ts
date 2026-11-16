import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BancoLocal, banco, gravarMeta, META, trocarBancoParaTeste } from "@/lib/tecnico/data/banco";
import { dexieRepositorio } from "@/lib/tecnico/data/dexie-repositorio";
import type { NovoServico } from "@/lib/tecnico/data/types";
import type { EquipamentoSincronizado, RespostaPull, ResultadoPush, ServicoParaEnviar } from "./tipos";
import { calcularEspera } from "./espera";
import { reiniciarEstado, lerEstado } from "./estado";
import { sincronizar } from "./motor";
import { aplicarPull } from "./pull";
import { enviarFila, tentarDeNovo } from "./push";
import { ErroDeRede, ErroDeSessao } from "./rede";

// ───────────────────────── servidor de mentira ─────────────────────────

type Falhas = {
  /** Faz `POST /api/fotos` dessa foto responder com este status. */
  foto?: Record<string, number>;
  /** Perde a resposta do push (o servidor processa, mas o celular não recebe): simula queda no meio. */
  perderRespostaDoPush?: boolean;
  /** Responde 401 em tudo. */
  semSessao?: boolean;
  /** Sem conexão: todo fetch lança. */
  offline?: boolean;
  /** Equipamentos que o servidor "não conhece" (push → 404 permanente). */
  equipamentosInexistentes?: Set<string>;
  /** Pede reenvio dessas fotos no push (arquivo não chegou ao disco). */
  fotosFaltando?: Record<string, string[]>;
};

function criarServidor() {
  const falhas: Falhas = {};
  const fotos = new Set<string>();
  const servicos = new Map<string, ServicoParaEnviar>();
  let chamadasPush = 0;

  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

  const fetchFalso = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (falhas.offline) throw new TypeError("Failed to fetch");
    const url = String(entrada);
    if (falhas.semSessao) return json({ erro: "Sessão expirada." }, 401);

    if (url === "/api/fotos") {
      const form = init!.body as FormData;
      const id = String(form.get("fotoId"));
      const status = falhas.foto?.[id];
      if (status) return json({ erro: "falhou" }, status);
      fotos.add(id);
      return json({ id }, 201);
    }

    if (url === "/api/sync/push") {
      chamadasPush++;
      const { servicos: lote } = JSON.parse(String(init!.body)) as { servicos: ServicoParaEnviar[] };
      const resultados: ResultadoPush[] = lote.map((s) => {
        if (falhas.equipamentosInexistentes?.has(s.equipamentoId)) {
          return { id: s.id, ok: false, erro: "Equipamento não encontrado.", permanente: true };
        }
        const faltando = (falhas.fotosFaltando?.[s.id] ?? []).filter((f) => !fotos.has(f) || falhas.fotosFaltando![s.id].includes(f));
        if (faltando.length) return { id: s.id, ok: false, criado: true, fotosFaltando: faltando };
        const criado = !servicos.has(s.id);
        servicos.set(s.id, s);
        return {
          id: s.id,
          ok: true,
          criado,
          servico: {
            id: s.id,
            equipamentoId: s.equipamentoId,
            tipo: s.tipo,
            data: s.data,
            descricao: s.descricao,
            checklist: s.checklist ?? [],
            proximaData: s.proximaData ?? null,
            criadoPor: "u1",
            criadoPorNome: "Técnico",
            criadoEm: new Date().toISOString(),
            fotos: (s.fotos ?? []).map((f) => ({ id: f.id, momento: f.momento, largura: null, altura: null })),
          },
        };
      });
      if (falhas.perderRespostaDoPush) throw new TypeError("Failed to fetch");
      return json({ resultados });
    }

    if (url.startsWith("/api/sync/pull")) {
      const pull: RespostaPull = {
        agora: new Date().toISOString(),
        completo: !url.includes("desde="),
        tipos: [],
        clientes: [],
        equipamentos: [],
        servicosPorEquipamento: {},
      };
      return json(pull);
    }
    return json({ erro: "rota desconhecida" }, 404);
  });

  return { falhas, fotos, servicos, fetch: fetchFalso, chamadasPush: () => chamadasPush };
}

// ───────────────────────── dados de teste ─────────────────────────

let contador = 0;
const uuid = () => {
  contador++;
  return `00000000-0000-4000-8000-${String(contador).padStart(12, "0")}`;
};

function equipamento(id: string, extra: Partial<EquipamentoSincronizado> = {}): EquipamentoSincronizado {
  return {
    id,
    nome: `Equipamento ${id.slice(-4)}`,
    tipoId: "t1",
    tipoNome: "Ar-condicionado",
    tipoIcone: null,
    localId: "l1",
    localNome: "Bloco A",
    clienteId: "c1",
    periodicidadeDias: 90,
    arquivado: false,
    ultimoServicoEm: null,
    proximaData: null,
    atributos: {},
    observacoes: null,
    campos: [],
    checklist: [],
    criadoEm: "2026-01-01T00:00:00.000Z",
    atualizadoEm: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

function novoServico(equipamentoId: string, extra: Partial<NovoServico> = {}): NovoServico {
  return {
    id: uuid(),
    equipamentoId,
    tipo: "preventiva",
    data: "2026-11-16",
    descricao: "Limpeza",
    checklist: [],
    proximaData: "2027-02-14",
    ...extra,
  };
}

const foto = (momento: "antes" | "depois" = "antes") => ({ id: uuid(), momento, arquivo: new Blob(["jpeg"], { type: "image/jpeg" }) });

let servidor: ReturnType<typeof criarServidor>;
const EQ = "00000000-0000-4000-8000-0000000000e1";

beforeEach(async () => {
  trocarBancoParaTeste(new BancoLocal(`teste-${++contador}`));
  servidor = criarServidor();
  vi.stubGlobal("fetch", servidor.fetch);
  reiniciarEstado();
  await gravarMeta(META.ultimoPull, "2026-11-16T10:00:00.000Z"); // já houve a 1ª sincronização
  await banco().equipamentos.put(equipamento(EQ, { ultimoServicoEm: "2026-08-01", proximaData: "2026-10-30" }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ───────────────────────── testes ─────────────────────────

describe("calcularEspera", () => {
  it("cresce 15 s, 30 s, 1 min… e para em 15 min", () => {
    expect([0, 1, 2, 3, 4].map(calcularEspera)).toEqual([0, 15_000, 30_000, 60_000, 120_000]);
    expect(calcularEspera(10)).toBe(15 * 60_000);
    expect(calcularEspera(99)).toBe(15 * 60_000);
  });
});

describe("registrar serviço offline", () => {
  it("fica na fila, aparece na linha do tempo com o selo e já conta no status", async () => {
    servidor.falhas.offline = true;
    const s = novoServico(EQ, { proximaData: "2027-02-14" });
    await dexieRepositorio.salvarServico(s, [foto("antes"), foto("depois")]);
    await sincronizar(); // tenta e não consegue

    expect(await banco().filaServicos.count()).toBe(1);
    expect(await banco().filaFotos.count()).toBe(2);

    const timeline = await dexieRepositorio.listarServicos(EQ);
    expect(timeline[0]).toMatchObject({ id: s.id, pendente: true });
    expect(timeline[0].fotos).toHaveLength(2);
    expect(timeline[0].fotos[0].url).toMatch(/^blob:/);

    const e = await dexieRepositorio.obterEquipamento(EQ);
    expect(e).toMatchObject({ ultimoServicoEm: "2026-11-16", proximaData: "2027-02-14", status: "em_dia" });
    expect(lerEstado().semInternet).toBe(true);
  });

  it("duplo toque em Salvar não cria dois", async () => {
    servidor.falhas.offline = true;
    const s = novoServico(EQ);
    await dexieRepositorio.salvarServico(s, []);
    await dexieRepositorio.salvarServico(s, []);
    expect(await banco().filaServicos.count()).toBe(1);
  });
});

describe("enviar a fila", () => {
  it("sobe fotos, depois o serviço, e só então tira da fila — sem duplicar ao repetir", async () => {
    const s = novoServico(EQ);
    const f1 = foto("antes");
    await dexieRepositorio.salvarServico(s, [f1]);
    await vi.waitFor(async () => expect(await banco().filaServicos.count()).toBe(0)); // o envio automático

    expect(servidor.fotos.has(f1.id)).toBe(true);
    expect(servidor.servicos.size).toBe(1);
    expect(await banco().filaFotos.count()).toBe(0);
    // O serviço confirmado vai para o Dexie, já sem selo de pendente.
    expect((await banco().servicos.get(s.id))?.descricao).toBe("Limpeza");
    const lista = await dexieRepositorio.listarServicos(EQ);
    expect(lista.filter((x) => x.id === s.id)).toHaveLength(1);
    expect(lista[0].pendente).toBeUndefined();

    await sincronizar();
    expect(servidor.servicos.size).toBe(1);
  });

  it("se a resposta do push se perde, a fila fica e o reenvio não duplica", async () => {
    servidor.falhas.perderRespostaDoPush = true;
    const s = novoServico(EQ);
    await dexieRepositorio.salvarServico(s, [foto()]);
    await vi.waitFor(() => expect(servidor.chamadasPush()).toBeGreaterThan(0));
    await vi.waitFor(() => expect(lerEstado().sincronizando).toBe(false));

    // O servidor já criou, mas o celular não soube: nada saiu da fila.
    expect(servidor.servicos.size).toBe(1);
    expect(await banco().filaServicos.count()).toBe(1);

    servidor.falhas.perderRespostaDoPush = false;
    await sincronizar();
    expect(await banco().filaServicos.count()).toBe(0);
    expect(servidor.servicos.size).toBe(1); // continua 1
  });

  it("uma foto que falha não trava os outros serviços; o que falhou espera (espera crescente) e não perde nada", async () => {
    servidor.falhas.offline = true;
    const a = novoServico(EQ, { descricao: "A" });
    const fa = foto();
    const b = novoServico(EQ, { descricao: "B" });
    await dexieRepositorio.salvarServico(a, [fa]);
    await dexieRepositorio.salvarServico(b, [foto()]);
    await sincronizar();
    servidor.falhas.offline = false;
    servidor.falhas.foto = { [fa.id]: 500 };

    const t0 = 1_000_000;
    const r = await enviarFila({ agora: () => t0 });
    expect(r.enviados).toBe(1);
    expect(servidor.servicos.has(b.id)).toBe(true);
    expect(servidor.servicos.has(a.id)).toBe(false);

    const itemA = await banco().filaServicos.get(a.id);
    expect(itemA).toMatchObject({ tentativas: 1, recusado: false });
    expect(itemA!.proximaTentativa).toBe(t0 + 15_000);
    expect(itemA!.erro).toContain("Foto");

    // Antes da hora: não tenta. Na hora (ou com "Sincronizar agora"): tenta.
    servidor.falhas.foto = {};
    expect((await enviarFila({ agora: () => t0 + 1000 })).enviados).toBe(0);
    expect((await enviarFila({ agora: () => t0 + 15_000 })).enviados).toBe(1);
    expect(servidor.servicos.has(a.id)).toBe(true);
    expect(await banco().filaServicos.count()).toBe(0);
  });

  it("'Sincronizar agora' ignora a espera", async () => {
    servidor.falhas.offline = true;
    const a = novoServico(EQ);
    const fa = foto();
    await dexieRepositorio.salvarServico(a, [fa]);
    servidor.falhas.offline = false;
    servidor.falhas.foto = { [fa.id]: 500 };
    await enviarFila({ agora: () => 5_000 });
    servidor.falhas.foto = {};
    expect((await enviarFila({ agora: () => 5_001 })).enviados).toBe(0); // ainda esperando
    expect((await enviarFila({ agora: () => 5_001, forcar: true })).enviados).toBe(1);
  });

  it("sem internet para tudo e nada é apagado; sessão expirada também guarda a fila", async () => {
    servidor.falhas.offline = true;
    await dexieRepositorio.salvarServico(novoServico(EQ), [foto()]);
    await expect(enviarFila()).rejects.toBeInstanceOf(ErroDeRede);

    servidor.falhas.offline = false;
    servidor.falhas.semSessao = true;
    await expect(enviarFila()).rejects.toBeInstanceOf(ErroDeSessao);
    expect(await banco().filaServicos.count()).toBe(1);
    expect(await banco().filaFotos.count()).toBe(1);

    const r = await sincronizar();
    expect(r.situacao).toBe("sessao-expirada");
    expect(lerEstado().sessaoExpirada).toBe(true);
  });

  it("serviço recusado de vez fica visível na fila e só volta com 'Tentar de novo'", async () => {
    const s = novoServico(EQ);
    servidor.falhas.offline = true;
    await dexieRepositorio.salvarServico(s, []);
    servidor.falhas.offline = false;
    servidor.falhas.equipamentosInexistentes = new Set([EQ]);

    await enviarFila();
    const item = await banco().filaServicos.get(s.id);
    expect(item).toMatchObject({ recusado: true, erro: "Equipamento não encontrado." });

    // Recusado não é reenviado sozinho…
    servidor.falhas.equipamentosInexistentes = new Set();
    expect((await enviarFila()).enviados).toBe(0);
    // …mas "Tentar de novo" libera.
    await tentarDeNovo(s.id);
    expect((await enviarFila()).enviados).toBe(1);
  });

  it("se o servidor não achou as fotos, elas são reenviadas e o serviço continua na fila", async () => {
    servidor.falhas.offline = true;
    const s = novoServico(EQ);
    const f = foto();
    await dexieRepositorio.salvarServico(s, [f]);
    servidor.falhas.offline = false;
    servidor.falhas.fotosFaltando = { [s.id]: [f.id] };

    await enviarFila();
    expect(await banco().filaServicos.count()).toBe(1);
    expect((await banco().filaFotos.get(f.id))?.enviada).toBe(0); // vai subir de novo

    servidor.falhas.fotosFaltando = {};
    expect((await enviarFila({ forcar: true })).enviados).toBe(1);
    expect(await banco().filaServicos.count()).toBe(0);
  });
});

describe("pull", () => {
  it("troca a lista de serviços do equipamento inteira (serviço excluído some) e mantém os outros equipamentos", async () => {
    const outro = "00000000-0000-4000-8000-0000000000e2";
    await banco().equipamentos.put(equipamento(outro));
    const sv = (id: string, equipamentoId: string) => ({
      id, equipamentoId, tipo: "preventiva" as const, data: "2026-10-01", descricao: "x", checklist: [], proximaData: null,
      criadoPor: null, criadoPorNome: null, criadoEm: "2026-10-01T10:00:00.000Z", fotos: [],
    });
    await banco().servicos.bulkPut([sv("s1", EQ), sv("s2", EQ), sv("s3", outro)]);

    await aplicarPull({
      agora: "2026-11-16T12:00:00.000Z",
      completo: false,
      tipos: [],
      clientes: [],
      equipamentos: [equipamento(EQ, { atualizadoEm: "2026-11-16T11:59:00.000Z" })],
      servicosPorEquipamento: { [EQ]: [sv("s1", EQ)] }, // o s2 foi excluído no computador
    });

    expect((await banco().servicos.toArray()).map((s) => s.id).sort()).toEqual(["s1", "s3"]);
    expect((await banco().meta.get(META.ultimoPull))?.valor).toBe("2026-11-16T11:58:00.000Z"); // agora − 2 min
  });

  it("o pull completo troca tudo", async () => {
    await aplicarPull({ agora: "2026-11-16T12:00:00.000Z", completo: true, tipos: [], clientes: [], equipamentos: [], servicosPorEquipamento: {} });
    expect(await banco().equipamentos.count()).toBe(0);
  });
});
