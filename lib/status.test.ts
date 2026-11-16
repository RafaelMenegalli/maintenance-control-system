import { describe, expect, it } from "vitest";
import {
  calcularStatus,
  calcularStatusPorServicos,
  diasAteVencer,
  textoStatus,
  textoVencimento,
  ultimoServico,
} from "./status";

// "Hoje" fixo (meio-dia, para não depender do fuso) — 16/11/2026.
const hoje = new Date(2026, 10, 16, 12, 0, 0);

describe("calcularStatus", () => {
  it("sem data é sem_registro", () => {
    expect(calcularStatus(null, hoje)).toBe("sem_registro");
    expect(calcularStatus(undefined, hoje)).toBe("sem_registro");
  });

  it("data no passado é vencido (inclusive ontem)", () => {
    expect(calcularStatus("2026-11-15", hoje)).toBe("vencido");
    expect(calcularStatus("2026-01-01", hoje)).toBe("vencido");
  });

  it("vence hoje ainda não está vencido: é vence_em_breve", () => {
    expect(calcularStatus("2026-11-16", hoje)).toBe("vence_em_breve");
  });

  it("até 15 dias é vence_em_breve; 16 dias já é em_dia", () => {
    expect(calcularStatus("2026-12-01", hoje)).toBe("vence_em_breve"); // +15
    expect(calcularStatus("2026-12-02", hoje)).toBe("em_dia"); // +16
  });

  it("data distante é em_dia", () => {
    expect(calcularStatus("2027-06-30", hoje)).toBe("em_dia");
  });

  it("ignora a hora do dia", () => {
    const cedo = new Date(2026, 10, 16, 0, 5);
    const tarde = new Date(2026, 10, 16, 23, 55);
    expect(calcularStatus("2026-11-16", cedo)).toBe("vence_em_breve");
    expect(calcularStatus("2026-11-16", tarde)).toBe("vence_em_breve");
    expect(calcularStatus("2026-11-15", cedo)).toBe("vencido");
  });

  it("funciona na virada de mês e de ano", () => {
    const fim = new Date(2026, 11, 28, 12);
    expect(calcularStatus("2027-01-12", fim)).toBe("vence_em_breve"); // +15
    expect(calcularStatus("2027-01-13", fim)).toBe("em_dia"); // +16
  });
});

describe("diasAteVencer", () => {
  it("conta dias de calendário", () => {
    expect(diasAteVencer("2026-11-21", hoje)).toBe(5);
    expect(diasAteVencer("2026-11-13", hoje)).toBe(-3);
    expect(diasAteVencer("2026-11-16", hoje)).toBe(0);
  });
});

describe("textoVencimento / textoStatus", () => {
  it("textos amigáveis", () => {
    expect(textoVencimento("2026-11-21", hoje)).toBe("vence em 5 dias");
    expect(textoVencimento("2026-11-17", hoje)).toBe("vence amanhã");
    expect(textoVencimento("2026-11-16", hoje)).toBe("vence hoje");
    expect(textoVencimento("2026-11-15", hoje)).toBe("venceu ontem");
    expect(textoVencimento("2026-11-13", hoje)).toBe("venceu há 3 dias");
  });

  it("textoStatus capitaliza e trata em dia / sem registro", () => {
    expect(textoStatus("2026-11-21", hoje)).toBe("Vence em 5 dias");
    expect(textoStatus("2026-11-13", hoje)).toBe("Venceu há 3 dias");
    expect(textoStatus("2027-03-01", hoje)).toBe("Em dia");
    expect(textoStatus(null, hoje)).toBe("Sem registro");
  });
});

describe("ultimoServico / calcularStatusPorServicos", () => {
  const servicos = [
    { data: "2026-05-01", proximaData: "2026-07-30", criadoEm: "2026-05-01T10:00:00Z" },
    { data: "2026-10-20", proximaData: "2027-01-18", criadoEm: "2026-10-20T10:00:00Z" },
    { data: "2026-08-01", proximaData: "2026-10-30", criadoEm: "2026-08-01T10:00:00Z" },
  ];

  it("pega o serviço de maior data", () => {
    expect(ultimoServico(servicos)?.data).toBe("2026-10-20");
  });

  it("em empate de data vale o criado por último", () => {
    const empate = [
      { data: "2026-10-20", proximaData: "2026-12-01", criadoEm: "2026-10-20T08:00:00Z" },
      { data: "2026-10-20", proximaData: "2027-02-01", criadoEm: "2026-10-20T17:00:00Z" },
    ];
    expect(ultimoServico(empate)?.proximaData).toBe("2027-02-01");
  });

  it("lista vazia não tem último serviço e é sem_registro", () => {
    expect(ultimoServico([])).toBeNull();
    expect(calcularStatusPorServicos([], hoje)).toBe("sem_registro");
  });

  it("o status vem do último serviço, não dos antigos vencidos", () => {
    expect(calcularStatusPorServicos(servicos, hoje)).toBe("em_dia");
  });
});
