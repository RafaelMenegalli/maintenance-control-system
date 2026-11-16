import { describe, expect, it } from "vitest";
import { resumirChecklist } from "./checklist";

const r = (resultado: "ok" | "nao_ok" | "na") => ({ resultado });

describe("resumirChecklist", () => {
  it("tudo OK", () => {
    const x = resumirChecklist([r("ok"), r("ok"), r("ok")]);
    expect(x.texto).toBe("3 de 3 OK");
    expect(x.temProblema).toBe(false);
  });

  it("um item Não OK vira destaque no singular", () => {
    const x = resumirChecklist([r("ok"), r("nao_ok"), r("ok")]);
    expect(x.texto).toBe("1 item Não OK");
    expect(x.temProblema).toBe(true);
  });

  it("vários Não OK no plural", () => {
    expect(resumirChecklist([r("nao_ok"), r("nao_ok"), r("ok")]).texto).toBe("2 itens Não OK");
  });

  it("N/A não conta como aplicável", () => {
    const x = resumirChecklist([r("ok"), r("ok"), r("na")]);
    expect(x.texto).toBe("2 de 2 OK · 1 N/A");
    expect(x.aplicaveis).toBe(2);
  });

  it("sem itens", () => {
    expect(resumirChecklist([]).texto).toBe("Sem checklist");
  });
});
