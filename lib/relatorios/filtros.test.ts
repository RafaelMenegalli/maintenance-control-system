import { describe, expect, it } from "vitest";
import { filtrosRelatorioSchema, nomeArquivoRelatorio } from "./filtros";

describe("nomeArquivoRelatorio", () => {
  it("monta o nome sem acentos, com datas dd-mm-aaaa", () => {
    expect(nomeArquivoRelatorio("Condomínio Exemplo Ltda (demonstração)", "2026-08-16", "2026-11-16")).toBe(
      "relatorio-manutencoes-condominio-exemplo-ltda-demonstracao-16-08-2026-a-16-11-2026.pdf",
    );
  });
  it("usa 'cliente' se o nome não tem letras", () => {
    expect(nomeArquivoRelatorio("???", "2026-01-01", "2026-01-31")).toBe("relatorio-manutencoes-cliente-01-01-2026-a-31-01-2026.pdf");
  });
});

describe("filtrosRelatorioSchema", () => {
  it("aceita um período válido e ignora filtros vazios", () => {
    const r = filtrosRelatorioSchema.safeParse({ inicio: "2026-01-01", fim: "2026-03-31", localId: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.localId).toBeUndefined();
  });
  it("recusa período invertido, muito longo ou data inexistente", () => {
    expect(filtrosRelatorioSchema.safeParse({ inicio: "2026-03-01", fim: "2026-01-01" }).success).toBe(false);
    expect(filtrosRelatorioSchema.safeParse({ inicio: "2020-01-01", fim: "2026-01-01" }).success).toBe(false);
    expect(filtrosRelatorioSchema.safeParse({ inicio: "2026-02-31", fim: "2026-03-01" }).success).toBe(false);
    expect(filtrosRelatorioSchema.safeParse({ fim: "2026-03-01" }).success).toBe(false);
  });
  it("recusa id que não é UUID", () => {
    expect(filtrosRelatorioSchema.safeParse({ inicio: "2026-01-01", fim: "2026-01-02", localId: "abc" }).success).toBe(false);
  });
});
